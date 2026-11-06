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
// Starter standard packs may only install official standard/* resources; recommended packs come first (list numbers follow file order).
const packs=JSON.parse(fs.readFileSync(path.join(root,'skills/adf-project-install/references/standard-packs.json'))).packs,packIds=new Set();
if(packs.findIndex(p=>p.category==='optional')>=0&&packs.slice(packs.findIndex(p=>p.category==='optional')).some(p=>p.category==='recommended')) errors.push('standard-packs.json: recommended packs must come before optional packs');
for(const p of packs) {
 if(!/^[a-z0-9-]+$/.test(p.id)||packIds.has(p.id)) errors.push(`standard-packs.json: invalid or duplicate id ${p.id}`);packIds.add(p.id);
 if(!['recommended','optional'].includes(p.category)) errors.push(`standard-packs.json: ${p.id} category must be recommended or optional`);
 for(const k of p.resources||[]) if(!k.startsWith('standard/')||!registry.resources[k]) errors.push(`standard-packs.json: ${p.id} references unknown standard ${k}`);
 for(const k of p.resources||[]) {const r=registry.resources[k];if(r&&!/^---\n[\s\S]*?^id:\s*\S+[\s\S]*?^status:\s*DRAFT$/m.test(fs.readFileSync(path.join(root,'skills',r.skill,r.path),'utf8'))) errors.push(`${k}: starter standard needs frontmatter id and status: DRAFT`);}
}
if(fs.existsSync(path.join(root,'framework/templates'))||fs.existsSync(path.join(root,'framework/review'))) errors.push('Duplicate legacy resources');
// macOS bash 3.2 會把緊接在 $VAR 後的非 ASCII 字元當成變數名稱（set -u 時 unbound variable），一律寫成 ${VAR}
for(const f of fs.readdirSync(path.join(root,'scripts')).filter(f=>f.endsWith('.sh'))) fs.readFileSync(path.join(root,'scripts',f),'utf8').split('\n').forEach((l,i)=>{if(/\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7F]/.test(l)) errors.push(`scripts/${f}:${i+1}: use \${VAR} before non-ASCII text (macOS bash 3.2)`);});
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${dirs.length} skills and ${seen.size} single-source resources.`);
