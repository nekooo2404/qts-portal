import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findJavaScriptFiles(path));
    if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}

const files = (
  await Promise.all(["src", "test", "integration", "scripts"].map(findJavaScriptFiles))
).flat().sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  process.stdout.write(`Syntax checked ${files.length} JavaScript files.\n`);
}
