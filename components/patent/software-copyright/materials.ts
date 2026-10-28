/**
 * 软著材料分四行：源码包 / 需求文档 / 界面截图 / 其他。
 *
 * 后端只按文件名保存材料，所以「从哪一行上传的」记在本地；
 * 记录丢失时按扩展名和文件名兜底。
 */

export const COPYRIGHT_SLOTS = [
  { key: "source", label: "项目源码包", hint: "ZIP，排除 node_modules、.git、dist" },
  { key: "requirements", label: "需求 / 设计文档", hint: "业务理解与功能清单的依据" },
  { key: "screens", label: "界面截图", hint: "操作手册的配图，可稍后补" },
  { key: "other", label: "其他材料", hint: "测试用例、补充说明" },
] as const;

export type CopyrightSlot = (typeof COPYRIGHT_SLOTS)[number]["key"];

const STORAGE_KEY = "ai:copyright:slots";

export function readCopyrightSlots(): Record<string, CopyrightSlot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CopyrightSlot>) : {};
  } catch {
    return {};
  }
}

export function writeCopyrightSlot(name: string, slot: CopyrightSlot): void {
  try {
    const map = readCopyrightSlots();
    map[name] = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 无痕模式忽略
  }
}

export function removeCopyrightSlot(name: string): void {
  try {
    const map = readCopyrightSlots();
    delete map[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 忽略
  }
}

export function inferCopyrightSlot(name: string): CopyrightSlot {
  const text = name.toLowerCase();
  if (text.endsWith(".zip") || text.endsWith(".tar") || text.endsWith(".gz")) return "source";
  if (/\.(png|jpe?g|webp|gif)$/.test(text)) return "screens";
  if (/需求|设计|说明|文档|prd/.test(text)) return "requirements";
  return "other";
}
