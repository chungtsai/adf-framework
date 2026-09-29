import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const framework = path.join(repo, "framework");
const target = path.resolve(process.argv[2] || process.cwd());
const VERSION = "5.1.0";

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}
function ensureFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, "utf8");
}

copyDir(path.join(framework, "standards"), path.join(target, "standards"));
copyDir(path.join(framework, "templates"), path.join(target, ".adf", "templates"));
copyDir(path.join(framework, "review"), path.join(target, ".adf", "framework", "review"));
copyDir(path.join(framework, "integrations"), path.join(target, ".adf", "framework", "integrations"));

ensureFile(path.join(target, ".adf", "VERSION"), VERSION + "\n");
ensureFile(
  path.join(target, "standards", "project", "issue-tracking.yaml"),
  fs.readFileSync(path.join(framework, "templates", "project", "issue-tracking.yaml"), "utf8")
);
fs.mkdirSync(path.join(target, "modules"), { recursive: true });

ensureFile(path.join(target, "CLAUDE.md"),
`# ADF
Use installed ADF skills for NEW, CHANGE, and MIGRATION.
Use adf-ask for read-only progress/navigation and adf-develop for orchestration.
ADF framework assets are under .adf/framework; project standards are under standards/.
`);
ensureFile(path.join(target, "AGENTS.md"),
`# ADF
Use installed ADF skills for NEW, CHANGE, and MIGRATION.
Prefer $adf-ask for progress/navigation and $adf-develop for orchestration.
ADF framework assets are under .adf/framework; project standards are under standards/.
`);

console.log(`ADF initialized: ${target}`);
console.log("Created or kept: .adf/VERSION, .adf/framework/, .adf/templates/, standards/, modules/, CLAUDE.md, AGENTS.md");
