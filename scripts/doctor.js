import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.argv[2] || process.cwd());
const checks = [
  [".adf/VERSION", fs.existsSync(path.join(target, ".adf", "VERSION"))],
  [".adf/framework/review", fs.existsSync(path.join(target, ".adf", "framework", "review"))],
  [".adf/framework/integrations/issue-tracking", fs.existsSync(path.join(target, ".adf", "framework", "integrations", "issue-tracking"))],
  [".adf/templates", fs.existsSync(path.join(target, ".adf", "templates"))],
  ["standards/development", fs.existsSync(path.join(target, "standards", "development"))],
  ["standards/migration", fs.existsSync(path.join(target, "standards", "migration"))],
  ["standards/project/issue-tracking.yaml", fs.existsSync(path.join(target, "standards", "project", "issue-tracking.yaml"))],
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
