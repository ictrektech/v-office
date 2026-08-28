import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? collectJavaScriptFiles(fullPath)
        : entry.isFile() && entry.name.endsWith(".js")
          ? [fullPath]
          : [];
    }),
  );
  return files.flat();
}

let bundles;
if (process.argv[2] === "-") {
  bundles = [await new Promise((resolve, reject) => {
    let content = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { content += chunk; });
    process.stdin.on("end", () => resolve(content));
    process.stdin.on("error", reject);
  })];
} else {
  const root = process.argv[2] ?? "out/_next/static/chunks";
  const files = await collectJavaScriptFiles(root);
  bundles = await Promise.all(files.map((file) => readFile(file, "utf8")));
}

const workerBundles = bundles.filter(
  (content) => content.includes("x2t-1/") && content.includes("importScripts"),
);

if (workerBundles.length === 0) {
  throw new Error("exported X2T worker bundle was not found");
}

const expectedPath = `${basePath}/x2t-1/`;
if (!workerBundles.some((content) => content.includes(expectedPath))) {
  throw new Error(`X2T worker does not use deployment path ${expectedPath}`);
}

if (
  basePath &&
  workerBundles.some((content) =>
    content.includes('self.location.origin+"/x2t-1/"'),
  )
) {
  throw new Error("X2T worker still resolves assets from the portal root");
}

console.log(`X2T worker path verified: ${expectedPath}`);
