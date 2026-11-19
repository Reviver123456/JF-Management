import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const paths = [
  ".next",
  "out",
  "test-results",
  "playwright-report",
  "blob-report"
];

const removed = [];

for (const name of paths) {
  const target = resolve(root, name);

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    removed.push(name);
    console.log(`removed ${name}/`);
  }
}

console.log(JSON.stringify({ ok: true, removed }));