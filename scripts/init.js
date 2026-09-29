import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const framework = path.join(repo, "framework");
const target = path.resolve(process.argv[2] || process.cwd());

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}
function ensureFile(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, "utf8");
}

copyDir(path.join(framework, "standards"), path.join(target, "standards"));
copyDir(path.join(framework, "templates"), path.join(target, ".adf", "templates"));
fs.mkdirSync(path.join(target, "modules"), { recursive: true });

ensureFile(path.join(target, "CLAUDE.md"),
`# ADF
Use installed ADF skills for NEW, CHANGE, and MIGRATION.
Use adf-ask for read-only progress/navigation and adf-develop for orchestration.
`);
ensureFile(path.join(target, "AGENTS.md"),
`# ADF
Use installed ADF skills for NEW, CHANGE, and MIGRATION.
Prefer $adf-ask for progress/navigation and $adf-develop for orchestration.
`);

console.log(`ADF initialized: ${target}`);
console.log("Created or kept: standards/, .adf/templates/, modules/, CLAUDE.md, AGENTS.md");
