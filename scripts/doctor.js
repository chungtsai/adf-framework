import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.argv[2] || process.cwd());

const requiredChecks = [
  [".adf/VERSION", fs.existsSync(path.join(target, ".adf", "VERSION"))],
  [".adf/framework/review", fs.existsSync(path.join(target, ".adf", "framework", "review"))],
  [".adf/templates", fs.existsSync(path.join(target, ".adf", "templates"))],
  ["standards/development", fs.existsSync(path.join(target, "standards", "development"))],
  ["standards/migration", fs.existsSync(path.join(target, "standards", "migration"))],
  ["modules", fs.existsSync(path.join(target, "modules"))],
  ["CLAUDE.md", fs.existsSync(path.join(target, "CLAUDE.md"))],
  ["AGENTS.md", fs.existsSync(path.join(target, "AGENTS.md"))],
];

let bad = 0;
for (const [name, ok] of requiredChecks) {
  console.log(`${ok ? "OK  " : "MISS"} ${name}`);
  if (!ok) bad++;
}

const issueConfig = path.join(target, "standards", "project", "issue-tracking.yaml");
const issueFramework = path.join(target, ".adf", "framework", "integrations", "issue-tracking");

if (!fs.existsSync(issueConfig)) {
  console.log("INFO issue-tracking: DISABLED");
} else {
  const config = fs.readFileSync(issueConfig, "utf8");
  const enabled = /^enabled:\s*true\s*$/mi.test(config);
  const provider = (config.match(/^provider:\s*(\w+)\s*$/mi)?.[1] || "UNKNOWN").toUpperCase();

  if (!enabled) {
    console.log(`INFO issue-tracking: DISABLED (provider=${provider})`);
  } else {
    const frameworkOk = fs.existsSync(issueFramework);
    console.log(`${frameworkOk ? "OK  " : "MISS"} .adf/framework/integrations/issue-tracking`);
    console.log(`INFO issue-tracking: ENABLED (provider=${provider})`);
    if (!frameworkOk) bad++;
  }
}

process.exitCode = bad ? 1 : 0;
