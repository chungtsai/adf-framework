import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'skills/adf-project-install/references/resources.json')));
const expected=JSON.parse(fs.readFileSync(path.join(root,'skills/adf-project-install/references/skills.json')));
const dirs=fs.readdirSync(path.join(root,'skills')).filter(d=>fs.existsSync(path.join(root,'skills',d,'SKILL.md'))).sort();
const errors=[];
if(JSON.stringify(dirs)!==JSON.stringify(expected)||dirs.length!==33) errors.push('Expected the 33 declared skills');
for(const name of dirs) {
 const folder=path.join(root,'skills',name),text=fs.readFileSync(path.join(folder,'SKILL.md'),'utf8');
 const front=text.match(/^---\s*\n([\s\S]*?)\n---/);
 if(!front||!front[1].includes(`name: ${name}`)||!/^description: .+/m.test(front?.[1]||'')) errors.push(`${name}: invalid frontmatter`);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)||name.length>64) errors.push(`${name}: invalid name`);
 if(/framework\/(review|templates)|install\/base/.test(text)&&name!=='adf-project-install') errors.push(`${name}: stale resource reference`);
 const version=JSON.parse(fs.readFileSync(path.join(folder,'references/release.json'))).version;
 if(version!==registry.version) errors.push(`${name}: release mismatch`);
}
// Shared rules live once in core/* and review/*; skills reference them through one canonical block.
const contract=fs.readFileSync(path.join(root,'skills/adf-project-install/references/skill-contract.md'),'utf8');
const canonical=contract.match(/```markdown\n(## 共用規範\n[\s\S]*?)```/)?.[1].trim();
if(!canonical) errors.push('skill-contract.md: canonical shared block not found');
const sharedLines=new Set((canonical||'').split('\n').map(l=>l.trim()).filter(Boolean));
const RETIRED_SECTIONS=['ADF 共通不變條件','v5.1 資源與舊專案相容性','Evidence-Guided Q&A'];
const lineOwners=new Map();
for(const name of dirs) {
 if(name==='adf-project-install') continue; // owner of the shared resources
 const text=fs.readFileSync(path.join(root,'skills',name,'SKILL.md'),'utf8');
 const block=text.match(/^## 共用規範\n[\s\S]*?(?=^## |(?![\s\S]))/m)?.[0].trim();
 if(block!==canonical) errors.push(`${name}: missing or modified "## 共用規範" block (copy it from core/skill-contract.md)`);
 for(const h of RETIRED_SECTIONS) if(new RegExp(`^## ${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`,'m').test(text)) errors.push(`${name}: duplicated shared section "${h}"; reference core/* instead`);
 for(const key of text.match(/`((?:core|review|template|standard)\/[^`\s]+)`/g)||[]) {
  const k=key.slice(1,-1); if(!registry.resources[k]) errors.push(`${name}: unknown resource key ${k}`);
 }
 const body=text.replace(/^---[\s\S]*?\n---\n/,'');
 for(const line of new Set(body.split('\n').map(l=>l.trim()).filter(l=>l.length>=20&&!l.startsWith('#')&&!sharedLines.has(l)))) {
  if(!lineOwners.has(line)) lineOwners.set(line,[]); lineOwners.get(line).push(name);
 }
}
// A rule copied into 3+ skills will drift; move it to core/invariants.md instead.
for(const [line,owners] of lineOwners) if(owners.length>=3) errors.push(`Duplicated rule in ${owners.length} skills (${owners.join(', ')}): ${line.slice(0,60)}`);
const seen=new Set();
for(const [key,r] of Object.entries(registry.resources)) {
 const p=`skills/${r.skill}/${r.path}`;
 if(seen.has(p))errors.push(`${key}: duplicate owner`);seen.add(p);
 if(!fs.existsSync(path.join(root,p)))errors.push(`${key}: missing resource`);
}
if(fs.existsSync(path.join(root,'framework/templates'))||fs.existsSync(path.join(root,'framework/review'))) errors.push('Duplicate legacy resources');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${dirs.length} skills and ${seen.size} single-source resources.`);
