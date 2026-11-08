import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(fs.readFileSync(path.join(here, '../references/resources.json')));
const VERSION = registry.version;
// Project configuration written by these tool versions has the same format and is accepted as-is.
const COMPATIBLE_TOOL_VERSIONS = registry.compatible_tool_versions || [VERSION];
// Install source tag: formal v<version>, or a pre-release v<version>-beta.N / -rc.N cut from the same content.
const REF_PATTERN = new RegExp(`^v${VERSION.replace(/\./g,'\\.')}(?:-(?:beta|rc)\\.[1-9][0-9]*)?$`);
export function isSupportedRef(ref) { return typeof ref==='string'&&REF_PATTERN.test(ref); }
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw new Error(message); };
function safe(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) fail('Unsafe relative path');
  const p = path.resolve(root, relative);
  if (p !== root && !p.startsWith(root + path.sep)) fail('Path escapes project');
  let cursor = root;
  if (fs.lstatSync(root).isSymbolicLink()) fail('Project root is a symlink');
  for (const part of path.relative(root,p).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor,part);
    if (fs.existsSync(cursor) || (()=>{try{fs.lstatSync(cursor);return true;}catch{return false;}})()) {
      if (fs.lstatSync(cursor).isSymbolicLink()) fail(`Symlink refused: ${relative}`);
    }
  }
  return p;
}
function files(root, relative) {
  const p = safe(root,relative); const out = {};
  if (!fs.existsSync(p)) return out;
  function walk(p) {
    const st=fs.lstatSync(p); if(st.isSymbolicLink()) fail(`Symlink refused: ${p}`);
    if(st.isDirectory()) for(const n of fs.readdirSync(p).sort()) walk(path.join(p,n));
    else if(st.isFile()) out[path.relative(root,p).split(path.sep).join('/')]=hash(fs.readFileSync(p));
    else fail('Unsupported file type');
  }
  walk(p);return out;
}
function snapshot(root) {
  return Object.assign({},...['standards','modules','CLAUDE.md','AGENTS.md','.adf/project.yaml','.adf/templates','.adf/relocations.json','skills-lock.json'].map(p=>files(root,p)));
}
function protectedSnapshot(root) {return Object.assign({},...['standards','modules','CLAUDE.md','AGENTS.md'].map(p=>files(root,p)));}
function skillLocation(root, name) {
  const candidates=['.agents/skills/','.claude/skills/'].map(p=>path.join(root,p,name)).filter(p=>fs.existsSync(p));
  if(!candidates.length) fail(`Missing project skill: ${name}; install with npx skills`);
  const real=candidates.map(p=>fs.realpathSync(p));
  for(const p of real) if(!p.startsWith(root+path.sep)) fail(`Global/external skill refused: ${name}`);
  const fingerprints=real.map(p=>files(p,''));
  if(fingerprints.some(f=>!equal(f,fingerprints[0]))) fail(`Conflicting project skills: ${name}`);
  for(const p of real) {
    const release=json(safe(p,'references/release.json'));
    if(release.version!==VERSION) fail(`Incompatible skill version: ${name}`);
    const text=fs.readFileSync(safe(p,'SKILL.md'),'utf8');
    if(!text.includes(`name: ${name}\n`)) fail(`Skill name mismatch: ${name}`);
  }
  return real[0];
}
export function resolveResource(root,key) {
  const r=registry.resources[key];if(!r) fail(`Unknown resource: ${key}`);
  const owner=skillLocation(root,r.skill);const p=safe(owner,r.path);
  if(!fs.existsSync(p)) fail(`Missing resource: ${key}`);return p;
}
function inventory(root) {
  const blockers=[], sources={};
  const owners=[...new Set(['adf-project-install',...Object.values(registry.resources).map(r=>r.skill)])];
  // A completed installation requires all 33 skills, not merely resource owners.
  const names=json(path.join(here,'../references/skills.json'));
  for(const name of [...new Set([...owners,...names])]) try {const p=skillLocation(root,name);sources[name]=files(p,'');} catch(e){blockers.push(e.message);}
  for(const key of Object.keys(registry.resources)) try {resolveResource(root,key);}catch(e){blockers.push(e.message);}
  let lock=null, ref=null;
  try {
    lock=json(safe(root,'skills-lock.json'));
    if(lock.version!==1||!lock.skills) fail('Unsupported npx skills lock format');
    for(const name of names) {
      const entry=lock.skills[name];
      if(!entry||entry.sourceType!=='github'||entry.source!=='chungtsai/adf-framework'||!isSupportedRef(entry.ref)||entry.skillPath!==`skills/${name}/SKILL.md`) fail(`Missing/unsupported formal npx source: ${name}`);
      if(ref&&entry.ref!==ref) fail(`Mixed npx source refs: ${ref} and ${entry.ref} (${name})`);
      ref=entry.ref;
      if(sources[name]) {
        const folder=skillLocation(root,name),h=crypto.createHash('sha256');
        for(const rel of Object.keys(sources[name]).sort((a,b)=>a.localeCompare(b))) {h.update(rel);h.update(fs.readFileSync(safe(folder,rel)));}
        if(h.digest('hex')!==entry.computedHash) fail(`Installed skill differs from npx lock: ${name}`);
      }
    }
  }catch(e){blockers.push(`Installation provenance: ${e.message}`);}
  const globals=[];
  for(const base of ['.agents/skills','.claude/skills','.codex/skills']) {
    const p=path.join(os.homedir(),base);
    if(fs.existsSync(p)) for(const n of fs.readdirSync(p).filter(n=>n.startsWith('adf-'))) globals.push(path.join(p,n));
  }
  for(const base of ['.agents/skills','.claude/skills']) {
    const dir=path.join(root,base);
    if(fs.existsSync(dir)) for(const name of fs.readdirSync(dir).filter(n=>n.startsWith('adf-'))) {
      if(!names.includes(name)) blockers.push(`Unknown/obsolete project skill requires relocation or disabling: ${base}/${name}`);
    }
  }
  for(const base of ['.codex/skills','.agent/skills','.gemini/skills','.opencode/skills']) {
    const dir=path.join(root,base);
    if(fs.existsSync(dir)) for(const name of fs.readdirSync(dir).filter(n=>n.startsWith('adf-'))) blockers.push(`Legacy/unsupported Agent skill location requires disabling: ${base}/${name}`);
  }
  for(const p of Object.keys(files(root,'standards'))) {
    if(/\.(md|yaml|yml|json)$/.test(p)&&/framework\/(review|templates)/.test(fs.readFileSync(safe(root,p),'utf8'))) blockers.push(`Unresolved legacy standard reference: ${p}`);
  }
  // Only project instructions are scanned; do not treat test evidence as executable configuration.
  for(const name of ['CLAUDE.md','AGENTS.md']) {
    const p=safe(root,name);
    if(fs.existsSync(p)&&/framework\/(review|templates)/.test(fs.readFileSync(p,'utf8'))) blockers.push(`Unresolved legacy instruction reference: ${name}`);
  }
  let config=null;
  const cfg=safe(root,'.adf/project.yaml');
  if(fs.existsSync(cfg)) try {config=json(cfg);if(config.manager!=='adf-project-install'||!['5.0','5.1'].includes(config.document_schema)||!COMPATIBLE_TOOL_VERSIONS.includes(config.tool_version)||config.scope!=='project') blockers.push('Unsupported project configuration; preserve and merge manually');}catch{blockers.push('Existing project.yaml requires manual YAML merge; no overwrite');}
  return {blockers:[...new Set(blockers)],sources,global_skills:globals,config,ref};
}
export function plan(root,resolutions={entries:[]}) {
  root=path.resolve(root);const inv=inventory(root), before=snapshot(root), relocations=[];
  if(!Array.isArray(resolutions.entries)) fail('Invalid resolutions');
  const global_dispositions=resolutions.global_dispositions||[];
  for(const g of inv.global_skills) if(!global_dispositions.some(e=>e.path===g&&e.human_confirmed===true&&e.disposition==='project_scope_only'&&typeof e.evidence==='string'&&e.evidence.trim())) inv.blockers.push(`Global skill needs confirmed project-only loading evidence: ${g}`);
  const templates=files(root,'.adf/templates');
  for(const [p,digest] of Object.entries(templates)) {
    const rel=p.slice('.adf/templates/'.length);
    if(registry.legacy_template_hashes[rel]?.includes(digest)) continue;
    const entry=resolutions.entries.find(e=>e.source===rel);
    if(!entry||entry.human_confirmed!==true||entry.source_hash!==digest||typeof entry.destination!=='string'||! /^(standards|modules)\//.test(entry.destination)) {inv.blockers.push(`Custom/unknown template requires confirmed relocation: ${rel}`);continue;}
    const dst=safe(root,entry.destination);
    if(!fs.existsSync(dst)||!fs.statSync(dst).isFile()||hash(fs.readFileSync(dst))!==entry.destination_hash) {inv.blockers.push(`Relocation evidence mismatch: ${rel}`);continue;}
    relocations.push(entry);
  }
  return {format:1,version:VERSION,root,before,sources:inv.sources,global_skills:inv.global_skills,blockers:inv.blockers,relocations,global_dispositions,
    actions:{create_project_config:!inv.config,remove_templates:Object.keys(templates)},
    preserve:['standards/**','modules/**','CLAUDE.md','AGENTS.md'],
    suggested_changes:['Missing v5.1 functional scenarios/specification are optional retrofit CHANGE for approved v5.0 modules']};
}
export function apply(root,p) {
  root=path.resolve(root);
  if(p.format!==1||p.version!==VERSION||p.root!==root) fail('Invalid plan target/version');
  const current=plan(root,{entries:p.relocations,global_dispositions:p.global_dispositions});
  if(!equal(current,p)) fail('Stale or altered plan; run PLAN again');
  if(p.blockers.length) fail(p.blockers.join('\n'));
  const state=safe(root,'.adf/migration.json');if(fs.existsSync(state)) {verify(root);return {status:'already_migrated'};}
  const id=crypto.randomUUID(), backup=safe(root,`.adf/backups/${id}`);
  fs.mkdirSync(backup,{recursive:true});
  const template=safe(root,'.adf/templates'), cfg=safe(root,'.adf/project.yaml');
  const record={id,version:VERSION,protected:protectedSnapshot(root),before:p.before,config_existed:fs.existsSync(cfg),templates_existed:fs.existsSync(template),relocations:p.relocations,global_dispositions:p.global_dispositions};
  if(record.templates_existed) fs.cpSync(template,path.join(backup,'templates'),{recursive:true});
  if(record.config_existed) fs.copyFileSync(cfg,path.join(backup,'project.yaml'));
  const backupHashes=files(backup,'');record.backup_hashes=backupHashes;
  fs.writeFileSync(path.join(backup,'record.json'),JSON.stringify(record,null,2),{flag:'wx'});
  try {
    if(!record.config_existed) {
      const legacy=Object.keys(files(root,'modules')).length>0||Object.keys(files(root,'standards')).length>0||record.templates_existed;
      fs.writeFileSync(cfg,JSON.stringify({manager:'adf-project-install',tool_version:VERSION,document_schema:legacy?'5.0':'5.1',adopted_base:'unknown',scope:'project',standards:{adopted:[],disabled:[],status:'not_inferred'},module_policy:'preserve_approved'},null,2)+'\n',{flag:'wx'});
    }
    const post={...record,after_config:hash(fs.readFileSync(cfg)),status:'pending_verification'};
    // Keep recovery pointer before deleting legacy copies.
    fs.writeFileSync(state,JSON.stringify(post,null,2),{flag:'wx'});
    if(record.templates_existed) fs.rmSync(template,{recursive:true});
    verify(root);
    fs.writeFileSync(state,JSON.stringify({...post,status:'verified',protected_after:protectedSnapshot(root)},null,2));
    return {status:'verified',backup:id};
  } catch(e) {fail(`Migration incomplete; backup ${id} retained: ${e.message}`);}
}
export function verify(root) {
  root=path.resolve(root);const inv=inventory(root);if(inv.blockers.length) fail(inv.blockers.join('\n'));
  if(fs.existsSync(safe(root,'.adf/templates'))) fail('Legacy templates still exist');
  const state=safe(root,'.adf/migration.json');if(!fs.existsSync(state)) fail('No migration record');
  const r=json(state);
  for(const g of inv.global_skills) if(!(r.global_dispositions||[]).some(e=>e.path===g&&e.human_confirmed===true&&e.disposition==='project_scope_only'&&typeof e.evidence==='string'&&e.evidence.trim())) fail(`Global skill needs confirmed project-only loading evidence: ${g}`);
  if(r.status!=='verified'&&!equal(protectedSnapshot(root),r.protected)) fail('Protected project content changed');
  if(r.status==='verified'&&!equal(r.protected_after,r.protected)) fail('Migration preservation evidence mismatch');
  if(hash(fs.readFileSync(safe(root,'.adf/project.yaml')))!==r.after_config) fail('Project configuration changed');
  checkBackup(root,r.id);
  // VERIFY itself stays read-only. Completion is represented by its successful result.
  return {status:'verified',version:VERSION,ref:inv.ref,prerelease:/-/.test(inv.ref||''),backup:r.id,subsequent_project_changes:!equal(protectedSnapshot(root),r.protected)};
}
function checkBackup(root,id) {
  if(typeof id!=='string'||! /^[0-9a-f-]{36}$/.test(id)) fail('Invalid backup ID');
  const dir=safe(root,`.adf/backups/${id}`),r=json(safe(dir,'record.json'));
  const actual=files(dir,'');delete actual['record.json'];
  if(!equal(actual,r.backup_hashes)) fail('Backup integrity mismatch');return {dir,r};
}
export function restore(root,id) {
  root=path.resolve(root);const {dir,r}=checkBackup(root,id),state=safe(root,'.adf/migration.json');
  if(!equal(protectedSnapshot(root),r.protected)) fail('Protected files changed; manual recovery required');
  const cfg=safe(root,'.adf/project.yaml'),templates=safe(root,'.adf/templates');
  if(fs.existsSync(state)) {const m=json(state);if(m.id!==id||hash(fs.readFileSync(cfg))!==m.after_config) fail('Recovery conflict');}
  else if(fs.existsSync(cfg)&&!r.config_existed) fail('New configuration conflict');
  if(fs.existsSync(templates)) fail('Template destination exists; manual recovery required');
  if(r.templates_existed) fs.cpSync(path.join(dir,'templates'),templates,{recursive:true,errorOnExist:true,force:false});
  if(r.config_existed) fs.copyFileSync(path.join(dir,'project.yaml'),cfg);else if(fs.existsSync(cfg)) fs.unlinkSync(cfg);
  if(fs.existsSync(state)) fs.unlinkSync(state);
  return {status:'restored',backup:id};
}
// Starter standards: copy selected official standard/* examples into the project's standards/.
// Sources are read from this tool's own skill tree (repository or installed layout), never from a global copy.
const STANDARD_PACKS=path.join(here,'../references/standard-packs.json');
const standardId=text=>text.match(/^---\n[\s\S]*?^id:\s*(\S+)/m)?.[1]||text.match(/^#\s+((?:DEV|MIG)-[A-Z0-9-]+)\s*$/m)?.[1]||null;
function standardSource(key) {
  const r=registry.resources[key];if(!r||!key.startsWith('standard/')) fail(`Unknown standard resource: ${key}`);
  const p=path.resolve(here,'../..',r.skill,r.path);if(!fs.existsSync(p)) fail(`Missing standard source: ${key}`);return p;
}
function projectStandardIds(root) {
  const ids={};
  for(const rel of Object.keys(files(root,'standards'))) if(rel.endsWith('.md')) {const id=standardId(fs.readFileSync(safe(root,rel),'utf8'));if(id) ids[id]=rel;}
  return ids;
}
export function standardsList(root) {
  root=path.resolve(root);const ids=projectStandardIds(root);
  return {version:VERSION,packs:json(STANDARD_PACKS).packs.map(p=>({...p,standards:p.resources.map(key=>{
    const id=standardId(fs.readFileSync(standardSource(key),'utf8')),target='standards/'+key.slice('standard/'.length),dest=safe(root,target);
    const state=fs.existsSync(dest)?(standardId(fs.readFileSync(dest,'utf8'))===id?'installed':'conflict'):(ids[id]?'conflict':'available');
    return {key,id,target,state,...(state==='conflict'?{existing:fs.existsSync(dest)?target:ids[id]}:{})};
  })})).map(p=>({...p,state:p.standards.every(s=>s.state==='installed')?'installed':p.standards.some(s=>s.state==='available')?'available':'conflict'}))};
}
// Resolve a selection to pack IDs. Tokens may be list numbers (1-based), pack IDs or standard IDs (DEV-*/MIG-*).
// select = exact list ('all' = every available pack). Otherwise the recommended packs minus `exclude` ('all' = none),
// plus optional packs in `add` ('all' = every optional pack). Returned in list order.
export function standardsSelect(root,{select,exclude,add,recommended}={}) {
  const packs=standardsList(root).packs,tokens=v=>String(v??'').split(/[\s,，、]+/).filter(Boolean);
  const find=t=>{
    if(/^\d+$/.test(t)) {const p=packs[Number(t)-1];if(p) return p;}
    const byId=packs.find(p=>p.id===t);if(byId) return byId;
    const byStd=packs.filter(p=>p.standards.some(s=>s.id===t.toUpperCase())).sort((a,b)=>a.standards.length-b.standards.length)[0];
    return byStd||fail(`Unknown standard pack: ${t}`);
  };
  const pick=(v,pool)=>{const t=tokens(v);return t.length===1&&/^(a|all)$/i.test(t[0])?pool:t.map(find);};
  let chosen;
  if(select!==undefined) {
    if(exclude!==undefined||add!==undefined||recommended) fail('--select cannot be combined with --recommended, --exclude or --add');
    chosen=pick(select,packs.filter(p=>p.state==='available'));
  } else {
    const rec=packs.filter(p=>p.category==='recommended'),opt=packs.filter(p=>p.category==='optional');
    const ex=pick(exclude,rec),ad=pick(add,opt);
    for(const p of ex) if(p.category!=='recommended') fail(`Not a recommended pack (use --add): ${p.id}`);
    for(const p of ad) if(p.category!=='optional') fail(`Not an optional pack (recommended packs are included unless excluded): ${p.id}`);
    chosen=[...rec.filter(p=>!ex.includes(p)),...ad];
  }
  const ids=packs.filter(p=>chosen.includes(p)).map(p=>p.id);
  if(!ids.length) fail('Select at least one standard pack');
  return ids;
}
// Dry run: which files the selection would write or skip (each standard once).
export function standardsPreview(root,ids) {
  const known=new Map(standardsList(root).packs.map(p=>[p.id,p])),seen=new Set(),standards=[];
  for(const id of ids) for(const s of (known.get(id)||fail(`Unknown standard pack: ${id}`)).standards) if(!seen.has(s.key)) {seen.add(s.key);standards.push(s);}
  return {ids,standards,write:standards.filter(s=>s.state==='available').length};
}
export function standardsInstall(root,ids,{status='DRAFT',ref=`v${VERSION}`,date=new Date().toISOString().slice(0,10)}={}) {
  root=path.resolve(root);
  if(!['DRAFT','APPROVED'].includes(status)) fail('Status must be DRAFT or APPROVED');
  if(!/^[A-Za-z0-9._/-]+$/.test(ref)) fail('Invalid source ref');
  if(!fs.existsSync(safe(root,'.adf/migration.json'))) fail('ADF is not installed in this project; run install.sh first');
  const list=standardsList(root),known=new Map(list.packs.map(p=>[p.id,p]));
  if(!Array.isArray(ids)||!ids.length) fail('Select at least one standard pack');
  for(const id of ids) if(!known.has(id)) fail(`Unknown standard pack: ${id}`);
  const written=[],skipped=[],seen=new Set();
  for(const id of ids) for(const s of known.get(id).standards) {
    if(seen.has(s.key)) continue;seen.add(s.key);
    if(s.state!=='available') {skipped.push({target:s.target,id:s.id,reason:s.state==='installed'?'already installed':`conflict with ${s.existing}`});continue;}
    let text=fs.readFileSync(standardSource(s.key),'utf8');
    const extra=[`source: adf-framework/${s.key}@${ref}`,...(status==='APPROVED'?[`approved_at: ${date}`,'approved_via: STANDARDS install (human selected and confirmed)']:[])];
    text=text.replace(/^status:\s*\S+$/m,`status: ${status}`).replace(/^(---\n[\s\S]*?\n)---\n/,(m,head)=>`${head}${extra.join('\n')}\n---\n`);
    const dest=safe(root,s.target);fs.mkdirSync(path.dirname(dest),{recursive:true});safe(root,s.target);
    fs.writeFileSync(dest,text,{flag:'wx'});written.push({target:s.target,id:s.id,status});
  }
  return {status:written.length?'installed':'nothing_to_install',written,skipped};
}
// 以實際路徑比對：macOS 的 TMPDIR（/var → /private/var）等 symlink 路徑下，argv[1] 與 import.meta.url 會不同，導致不執行也沒有輸出
const isMain=()=>{try{return fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url));}catch{return false;}};
if(process.argv[1]&&isMain()) {
  try {
    const argv=process.argv.slice(2),opt=name=>{const i=argv.indexOf(name);if(i<0) return undefined;const v=argv[i+1];if(!v||v.startsWith('--')) fail(`${name} requires a value`);argv.splice(i,2);return v;};
    const flag=name=>{const i=argv.indexOf(name);if(i<0) return false;argv.splice(i,1);return true;};
    const status=opt('--status'),ref=opt('--ref'),sel={select:opt('--select'),exclude:opt('--exclude'),add:opt('--add'),recommended:flag('--recommended')},dry=flag('--dry-run');
    const [mode,target,arg]=argv;if(!target) fail('Usage: project.mjs CHECK|PLAN|APPLY|VERIFY|RESTORE|resolve|STANDARDS <project> [argument]');
    const root=path.resolve(target);
    const picked=mode!=='STANDARDS'?null:arg!==undefined?(Object.values(sel).some(v=>v)?fail('Give pack IDs or selection options, not both'):arg.split(',').map(x=>x.trim()).filter(Boolean)):Object.values(sel).some(v=>v)?standardsSelect(root,sel):null;
    const result=mode==='STANDARDS'?(!picked?standardsList(root):dry?standardsPreview(root,picked):standardsInstall(root,picked,{status,ref})):mode==='CHECK'?plan(root):mode==='PLAN'?plan(root,arg?json(arg):undefined):mode==='APPLY'?apply(root,json(arg)):mode==='VERIFY'?verify(root):mode==='RESTORE'?restore(root,arg):mode==='resolve'?{path:resolveResource(root,arg)}:fail('Unknown mode');
    console.log(JSON.stringify(result,null,2));if(result.blockers?.length) process.exitCode=1;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
