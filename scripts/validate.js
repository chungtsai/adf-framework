import fs from "node:fs";
import path from "node:path";
const root=process.cwd(), skills=path.join(root,"skills");
let errors=[];
const dirs=fs.readdirSync(skills).filter(d=>fs.statSync(path.join(skills,d)).isDirectory());
for (const d of dirs) {
  const p=path.join(skills,d,"SKILL.md");
  if (!fs.existsSync(p)) { errors.push(`${d}: missing SKILL.md`); continue; }
  const t=fs.readFileSync(p,"utf8");
  const m=t.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) { errors.push(`${d}: invalid/missing YAML frontmatter`); continue; }
  const name=(m[1].match(/^name:\s*(.+)$/m)||[])[1]?.trim();
  const desc=(m[1].match(/^description:\s*(.+)$/m)||[])[1]?.trim();
  if(name!==d) errors.push(`${d}: name mismatch`);
  if(!/^[a-z0-9-]{1,64}$/.test(name||'')) errors.push(`${d}: invalid skill name`);
  if(!desc) errors.push(`${d}: missing description`);
  if((desc||'').length>1024) errors.push(`${d}: description too long`);
  if(!t.slice(m[0].length).trim()) errors.push(`${d}: empty instructions`);
}
if(dirs.length!==32) errors.push(`expected 32 skills, found ${dirs.length}`);
for (const f of ['interactive-review.md','question-schema.md','approval-gate.md','terminology.md']) {
  if(!fs.existsSync(path.join(root,'framework','review',f))) errors.push(`framework/review/${f}: missing`);
}
if(errors.length){ console.error(errors.join("\n")); process.exit(1); }
console.log(`Validated ${dirs.length} ADF skills and shared review framework.`);
