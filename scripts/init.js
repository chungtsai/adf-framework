import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const framework = path.join(repo, "framework");
const args = process.argv.slice(2);
const targetArg = args.find(arg => !arg.startsWith("--"));
const issueArg = args.find(arg => arg.startsWith("--issue-tracking="));
const issueProvider = issueArg?.split("=")[1]?.toLowerCase();
const target = path.resolve(targetArg || process.cwd());
const VERSION = "5.1.0";

if (issueProvider && !["gitlab", "github"].includes(issueProvider)) {
  console.error("Invalid --issue-tracking value. Use gitlab or github.");
  process.exit(1);
}

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

ensureFile(path.join(target, ".adf", "VERSION"), VERSION + "\n");
fs.mkdirSync(path.join(target, "modules"), { recursive: true });

if (issueProvider) {
  copyDir(
    path.join(framework, "integrations", "issue-tracking"),
    path.join(target, ".adf", "framework", "integrations", "issue-tracking")
  );

  const template = fs.readFileSync(
    path.join(framework, "templates", "project", "issue-tracking.yaml"),
    "utf8"
  );
  const config = template
    .replace(/^provider:\s*\w+/m, `provider: ${issueProvider.toUpperCase()}`)
    .replace(/^enabled:\s*false/m, "enabled: true");

  ensureFile(path.join(target, "standards", "project", "issue-tracking.yaml"), config);
}

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
console.log("Created or kept: .adf/VERSION, .adf/framework/review, .adf/templates, standards/, modules/, CLAUDE.md, AGENTS.md");
if (issueProvider) {
  console.log(`Optional issue tracking enabled: ${issueProvider.toUpperCase()}`);
} else {
  console.log("Optional issue tracking: DISABLED");
}
