/**
 * docx 页眉/页脚浮动对象环绕修正（sdkjs 渲染兼容层）。
 *
 * 背景：
 * x2t 把 docx 转成内部 Editor.bin 是正常的（产物合法、无报错），LibreOffice /
 * WPS / Word 渲染同一份文件也正常，唯独 sdkjs 渲染时第一页会整体错位。
 *
 * 定位结论：sdkjs 会把「页眉/页脚里的浮动对象（wp:anchor）」当成正文的环绕
 * 对象，用它的宽度去压缩正文的可用宽度。WPS 导出的表单类文档很常见「页眉里
 * 放一个比正文区还宽的透明文本框（里面套一张表格）」，此时正文中
 * `tblLayout="fixed"` 的表格列宽会被整体算错 —— 表现为第一页表格溢出页面、
 * 列宽错乱，而后续页（没有再被环绕计算影响）看起来是好的。
 *
 * 处理方式：在把 docx 交给 x2t 之前，把页眉/页脚中浮动对象的环绕方式改成
 * `wrapNone`。页眉内容原样保留，只是不再参与正文环绕计算。
 * 只改页眉/页脚，不动正文里的浮动对象（正文环绕是正常功能，改了会破坏排版）。
 */

const ZIP_SIG_EOCD = 0x06054b50;
const ZIP_SIG_CENTRAL = 0x02014b50;
const ZIP_SIG_LOCAL = 0x04034b50;

const ZIP_FLAG_ENCRYPTED = 0x0001;
const ZIP_FLAG_DATA_DESCRIPTOR = 0x0008;

/** 页眉/页脚部件：word/header1.xml、word/footer2.xml … */
const HEADER_FOOTER_PART = /^word\/(?:header|footer)\d*\.xml$/;

/** 需要改成 wrapNone 的环绕方式（wrapNone 本身除外）。 */
const WRAP_AROUND = /<wp:wrap(?:Square|Tight|Through|TopAndBottom)\b[^>]*\/>/g;
const WRAP_AROUND_PAIRED =
  /<wp:wrap(?:Square|Tight|Through|TopAndBottom)\b[^>]*>[\s\S]*?<\/wp:wrap(?:Square|Tight|Through|TopAndBottom)>/g;

interface ZipEntry {
  name: string;
  flags: number;
  method: number;
  time: number;
  date: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

interface ZipEntryOut extends Omit<ZipEntry, "localOffset"> {
  data: Uint8Array;
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }
  const table = crcTable;
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 从尾部 EOCD 记录定位中央目录。缺失或异常返回 -1。 */
function findEndOfCentralDirectory(view: DataView): number {
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (view.getUint32(i, true) === ZIP_SIG_EOCD) return i;
  }
  return -1;
}

function readCentralDirectory(
  bytes: Uint8Array,
  view: DataView,
): ZipEntry[] | null {
  const eocd = findEndOfCentralDirectory(view);
  if (eocd < 0) return null;

  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    if (cursor + 46 > bytes.length) return null;
    if (view.getUint32(cursor, true) !== ZIP_SIG_CENTRAL) return null;

    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);

    entries.push({
      name: decoder.decode(
        bytes.subarray(cursor + 46, cursor + 46 + nameLength),
      ),
      flags: view.getUint16(cursor + 8, true),
      method: view.getUint16(cursor + 10, true),
      time: view.getUint16(cursor + 12, true),
      date: view.getUint16(cursor + 14, true),
      crc: view.getUint32(cursor + 16, true),
      compressedSize: view.getUint32(cursor + 20, true),
      uncompressedSize: view.getUint32(cursor + 24, true),
      localOffset: view.getUint32(cursor + 42, true),
    });

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/** 按 local header 定位条目已压缩数据；越界返回 null。 */
function readEntryData(
  bytes: Uint8Array,
  view: DataView,
  entry: ZipEntry,
): Uint8Array | null {
  const local = entry.localOffset;
  if (local + 30 > bytes.length) return null;
  if (view.getUint32(local, true) !== ZIP_SIG_LOCAL) return null;

  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const start = local + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > bytes.length) return null;
  return bytes.subarray(start, end);
}

function writeUint8(target: Uint8Array, source: Uint8Array, offset: number) {
  target.set(source, offset);
}

/** 用给定条目重建 zip（本地头 + 中央目录 + EOCD）。 */
function buildZip(entries: ZipEntryOut[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    // data descriptor 位必须清掉：下面写入的是真实的 crc/size
    const flags = entry.flags & ~ZIP_FLAG_DATA_DESCRIPTOR;

    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, ZIP_SIG_LOCAL, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, flags, true);
    localView.setUint16(8, entry.method, true);
    localView.setUint16(10, entry.time, true);
    localView.setUint16(12, entry.date, true);
    localView.setUint32(14, entry.crc, true);
    localView.setUint32(18, entry.compressedSize, true);
    localView.setUint32(22, entry.uncompressedSize, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    writeUint8(local, nameBytes, 30);
    parts.push(local, entry.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, ZIP_SIG_CENTRAL, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, flags, true);
    centralView.setUint16(10, entry.method, true);
    centralView.setUint16(12, entry.time, true);
    centralView.setUint16(14, entry.date, true);
    centralView.setUint32(16, entry.crc, true);
    centralView.setUint32(20, entry.compressedSize, true);
    centralView.setUint32(24, entry.uncompressedSize, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    writeUint8(central, nameBytes, 46);
    centralParts.push(central);

    offset += local.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((sum, c) => sum + c.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, ZIP_SIG_EOCD, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const all = [...parts, ...centralParts, eocd];
  const total = all.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of all) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

/** 归一化输入：调用方可能给 ArrayBuffer，也可能给 Uint8Array。 */
function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/** 返回范围精确的 ArrayBuffer（避免把底层大 buffer 一起带出去）。 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer as ArrayBuffer;
  }
  return bytes.slice().buffer as ArrayBuffer;
}

/**
 * 把页眉/页脚中浮动对象的环绕方式改为 wrapNone。
 *
 * 不是 docx（不是 zip）、没有页眉页脚、或没有任何环绕对象时原样返回，
 * 因此对绝大多数文档是零开销；解析失败也一律回退到原始数据，绝不阻断打开。
 */
export async function relaxHeaderFooterAnchors(
  input: ArrayBuffer | Uint8Array,
): Promise<ArrayBuffer> {
  const source = toUint8Array(input);
  try {
    if (source.byteLength < 22) return toArrayBuffer(source);
    const bytes = source;
    // 用 byteOffset/byteLength 构造，兼容"大 buffer 的切片"
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // 非 zip（例如老版 .doc 二进制）直接跳过
    if (view.getUint32(0, true) !== ZIP_SIG_LOCAL) return toArrayBuffer(bytes);

    const entries = readCentralDirectory(bytes, view);
    if (!entries) return toArrayBuffer(bytes);

    let changed = false;
    const rewritten: ZipEntryOut[] = [];

    for (const entry of entries) {
      const raw = readEntryData(bytes, view, entry);
      if (!raw) return toArrayBuffer(bytes);

      const isTarget =
        HEADER_FOOTER_PART.test(entry.name) &&
        !(entry.flags & ZIP_FLAG_ENCRYPTED) &&
        (entry.method === 0 || entry.method === 8);

      if (isTarget) {
        const xmlBytes =
          entry.method === 0 ? raw : await inflateRaw(raw);
        const xml = new TextDecoder().decode(xmlBytes);
        const fixed = xml
          .replace(WRAP_AROUND_PAIRED, "<wp:wrapNone/>")
          .replace(WRAP_AROUND, "<wp:wrapNone/>");

        if (fixed !== xml) {
          changed = true;
          const encoded = new TextEncoder().encode(fixed);
          const compressed = await deflateRaw(encoded);
          rewritten.push({
            name: entry.name,
            flags: entry.flags,
            method: 8,
            time: entry.time,
            date: entry.date,
            crc: crc32(encoded),
            compressedSize: compressed.length,
            uncompressedSize: encoded.length,
            data: compressed,
          });
          continue;
        }
      }

      rewritten.push({
        name: entry.name,
        flags: entry.flags,
        method: entry.method,
        time: entry.time,
        date: entry.date,
        crc: entry.crc,
        compressedSize: entry.compressedSize,
        uncompressedSize: entry.uncompressedSize,
        data: raw,
      });
    }

    if (!changed) return toArrayBuffer(bytes);
    return toArrayBuffer(buildZip(rewritten));
  } catch (error) {
    console.error("Failed to relax header/footer anchors", error);
    return toArrayBuffer(source);
  }
}
