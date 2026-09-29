import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.argv[2] || process.cwd());
const checks = [
  ["standards", fs.existsSync(path.join(target, "standards"))],
  [".adf/templates", fs.existsSync(path.join(target, ".adf", "templates"))],
  ["modules", fs.existsSync(path.join(target, "modules"))],
  ["CLAUDE.md", fs.existsSync(path.join(target, "CLAUDE.md"))],
  ["AGENTS.md", fs.existsSync(path.join(target, "AGENTS.md"))],
];
let bad = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "OK  " : "MISS"} ${name}`);
  if (!ok) bad++;
}
process.exitCode = bad ? 1 : 0;
