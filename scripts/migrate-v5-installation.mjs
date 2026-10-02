import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import readline from 'node:readline/promises';

export const CLI_VERSION='1.7.0';
const REPO='chungtsai/adf-framework';
const ROOTS=['.agents/skills','.claude/skills','.codex/skills'];
const AGENTS={'claude-code':'.claude/skills',codex:'.agents/skills'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=s=>{throw new Error(s);};
function inside(root,p){return p===root||p.startsWith(root+path.sep);}
function relative(p){return typeof p==='string'&&!path.isAbsolute(p)&&p.split(/[\\/]/).every(x=>x&&x!=='.'&&x!=='..');}
function safe(root,rel,{leafLink=false}={}){
 if(!relative(rel))fail('Unsafe relative path');
 const target=path.resolve(root,rel);if(!inside(root,target))fail('Path escapes project');
 let current=root;const parts=path.relative(root,target).split(path.sep);
 for(let i=0;i<parts.length;i++){
  current=path.join(current,parts[i]);let st;try{st=fs.lstatSync(current);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  if(st.isSymbolicLink()&&!(leafLink&&i===parts.length-1))fail(`Symlink refused: ${rel}`);
 }
 return target;
}
function exists(p){try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function snapshotPath(p){
 if(!exists(p))return null;
 const out={};
 function walk(current,rel){const st=fs.lstatSync(current);
  if(st.isSymbolicLink()){out[rel]={link:fs.readlinkSync(current)};return;}
  if(st.isDirectory()){out[rel]={directory:true};for(const n of fs.readdirSync(current).sort())walk(path.join(current,n),rel?`${rel}/${n}`:n);}
  else if(st.isFile())out[rel]={hash:sha(fs.readFileSync(current)),mode:st.mode&0o777};else fail('Unsupported file type');
 }
 walk(p,'');return out;
}
function ordinaryFiles(root){
 const files={};
 function walk(p,rel){const st=fs.lstatSync(p);if(st.isSymbolicLink())fail(`Unexpected symlink in source/installed files: ${rel}`);
  if(st.isDirectory())for(const n of fs.readdirSync(p).sort()){
   if(['.git','node_modules','__pycache__','__pypackages__','metadata.json'].includes(n))continue;
   walk(path.join(p,n),rel?`${rel}/${n}`:n);
  }else if(st.isFile())files[rel]=fs.readFileSync(p);
 }
 walk(root,'');return files;
}
function preview(root,file){const p=path.join(root,file);if(!fs.existsSync(p))return null;const b=fs.readFileSync(p);if(b.includes(0))return {binary:true,bytes:b.length};const text=b.toString('utf8');return {text:text.slice(0,20000),truncated:text.length>20000};}
function changesWithPreview(oldRoot,newRoot){const a=oldRoot&&fs.existsSync(oldRoot)?hashes(oldRoot):{},b=newRoot&&fs.existsSync(newRoot)?hashes(newRoot):{};return diff(a,b).map(d=>({...d,before:oldRoot?preview(oldRoot,d.file):null,after:newRoot?preview(newRoot,d.file):null}));}
function hashes(root){return Object.fromEntries(Object.entries(ordinaryFiles(root)).map(([p,b])=>[p,sha(b)]));}
function folderHash(root){const h=crypto.createHash('sha256');for(const [p,b]of Object.entries(ordinaryFiles(root)).sort(([a],[b])=>a.localeCompare(b))){h.update(p);h.update(b);}return h.digest('hex');}
function diff(a,b){return [...new Set([...Object.keys(a),...Object.keys(b)])].sort().filter(p=>a[p]!==b[p]).map(p=>({file:p,kind:!(p in a)?'add':!(p in b)?'remove':'replace',old:a[p]||null,next:b[p]||null}));}
function run(command,args,cwd){
 let executable=command,argv=args;
 if(process.platform==='win32'&&command==='npx'){
  // Invoke the npm JavaScript entry instead of interpolating a cmd.exe command.
  const candidates=(process.env.PATH||'').split(path.delimiter).map(d=>path.join(d,'node_modules/npm/bin/npx-cli.js'));
  const entry=candidates.find(fs.existsSync);if(!entry)fail('Cannot locate npx-cli.js; install Node.js/npm with a standard PATH');
  executable=process.execPath;argv=[entry,...args];
 }
 const r=spawnSync(executable,argv,{cwd,encoding:'utf8',shell:false,timeout:120000,env:{...process.env,DISABLE_TELEMETRY:'1'}});
 if(r.error||r.status!==0)fail(`${command} failed (${r.status??r.error?.code}); no project installation was committed`);
 return r.stdout;
}
export function fetchSource(ref){
 if(!/^[A-Za-z0-9][A-Za-z0-9_./-]{0,150}$/.test(ref)||ref.includes('..'))fail('Invalid source ref');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'adf-v5-source-'));
 try{
  run('git',['init','--quiet'],tmp);
  run('git',['-c','core.hooksPath=/dev/null','fetch','--depth','1',`https://github.com/${REPO}.git`,ref],tmp);
  const commit=run('git',['rev-parse','FETCH_HEAD'],tmp).trim();
  run('git',['-c','core.hooksPath=/dev/null','checkout','--detach','FETCH_HEAD'],tmp);
  return {root:tmp,commit,requested_ref:ref,dispose:()=>fs.rmSync(tmp,{recursive:true,force:true})};
 }catch(e){fs.rmSync(tmp,{recursive:true,force:true});throw e;}
}
function sourceInfo(source){
 if(!/^[0-9a-f]{40}$/.test(source.commit))fail('Source must resolve to an immutable commit');
 if(readJSON(path.join(source.root,'package.json')).version!=='5.0.0')fail('This tool only transfers ADF 5.0.0; not a v5.1 upgrade');
 const dir=path.join(source.root,'skills'),names=fs.readdirSync(dir).filter(n=>fs.existsSync(path.join(dir,n,'SKILL.md'))).sort();
 if(names.length!==32||names.some(n=>!/^adf-[a-z0-9-]+$/.test(n)))fail('Expected official v5.0 32-skill source');
 return {names,source:`https://github.com/${REPO}/tree/${source.commit}`};
}
function managedRoots(extra){
 for(const r of extra)if(!relative(r)||/^(standards|modules|framework|\.git|node_modules|\.adf)(\/|$)/.test(r)||r.split('/').length<2||!r.endsWith('/skills'))fail('Legacy roots must be dedicated project skill containers');
 return [...new Set([...ROOTS,...extra])].sort();
}
function protectedState(project){return Object.fromEntries(['standards','modules','.adf/templates'].map(p=>[p,snapshotPath(safe(project,p))]));}
function guideText(original,source){
 const begin='<!-- ADF V5 NPX BEGIN -->',end='<!-- ADF V5 NPX END -->';
 const block=`${begin}\nADF v5.0 Skills are managed by project-scoped npx skills. Source commit: ${source.commit}.\nResolve shared Review resources from this project's framework/review/; keep existing standards/, modules/ and .adf/templates/. Do not infer a v5.1 upgrade.\n${end}`;
 if(original.includes(begin)||original.includes(end)){
  const a=original.indexOf(begin),b=original.indexOf(end);
  if(a<0||b<a||original.indexOf(begin,a+1)>=0||original.indexOf(end,b+1)>=0)fail('Malformed ADF managed guidance block');
  return original.slice(0,a)+block+original.slice(b+end.length);
 }
 return original+(original.endsWith('\n')?'':'\n')+'\n'+block+'\n';
}
export function buildPlan(project,source,{agent='claude-code',legacy=[]}={}){
 project=path.resolve(project);if(!fs.statSync(project).isDirectory()||fs.lstatSync(project).isSymbolicLink())fail('Project must be a real directory');
 if(!AGENTS[agent])fail('Supported agents: claude-code, codex');
 const info=sourceInfo(source),roots=managedRoots(legacy),candidates=[],differences=[],blockers=[];
 const watched={};for(const r of roots)watched[r]=snapshotPath(safe(project,r));
 for(const r of roots){const dir=safe(project,r);if(!exists(dir))continue;
  for(const n of fs.readdirSync(dir).sort()){
   if(!/^adf-[a-z0-9-]+$/.test(n))continue;
   const rel=`${r}/${n}`,p=safe(project,rel,{leafLink:true});
   if(!fs.existsSync(path.join(p,'SKILL.md'))){blockers.push(`Unrecognized ADF entry: ${rel}`);continue;}
   if(!inside(project,fs.realpathSync(p))){blockers.push(`External/global linked skill is not automatically removed: ${rel}`);continue;}
   candidates.push(rel);const old=hashes(fs.realpathSync(p)),official=info.names.includes(n)?hashes(path.join(source.root,'skills',n)):{};
   const changes=changesWithPreview(fs.realpathSync(p),info.names.includes(n)?path.join(source.root,'skills',n):null);if(changes.length)differences.push({path:rel,changes});
  }
 }
 const selected=AGENTS[agent];
 const targets=[...new Set([...candidates,...info.names.flatMap(n=>[`.agents/skills/${n}`,`${selected}/${n}`]),'skills-lock.json','framework/review','CLAUDE.md','AGENTS.md'])].sort();
 for(const p of targets)watched[p]=snapshotPath(safe(project,p,{leafLink:p.includes('/skills/')}));
 const review=path.join(source.root,'framework/review');if(!fs.existsSync(review))fail('Source has no v5.0 Review resources');
 const localReview=safe(project,'framework/review');const reviewDiff=changesWithPreview(exists(localReview)?localReview:null,review);if(reviewDiff.length)differences.push({path:'framework/review',changes:reviewDiff});
 const guidances={};for(const p of ['CLAUDE.md','AGENTS.md']){const f=safe(project,p);const before=exists(f)?fs.readFileSync(f,'utf8'):'';guidances[p]=guideText(before,source);if(before!==guidances[p])differences.push({path:p,kind:exists(f)?'merge-managed-block':'create',next:guidances[p]});}
 const lockPath=safe(project,'skills-lock.json');let lock={version:1,skills:{}};
 if(exists(lockPath))try{lock=readJSON(lockPath);if(lock.version!==1||!lock.skills||typeof lock.skills!=='object')fail('Unknown lock format');}catch{blockers.push('Existing skills-lock.json is unsupported; preserve it and resolve before transfer');}
 const globalSkills=[];for(const r of ['.agents/skills','.claude/skills','.codex/skills']){const p=path.join(os.homedir(),r);if(fs.existsSync(p))for(const n of fs.readdirSync(p).filter(n=>n.startsWith('adf-')))globalSkills.push(path.join(p,n));}
 let git={available:false};try{git={available:true,head:run('git',['rev-parse','HEAD'],project).trim(),status:run('git',['status','--porcelain=v1','--untracked-files=all'],project)};}catch{}
 return {format:1,tool:'adf-v5-npx-transfer',adf_version:'5.0.0',management_from:'manual',management_to:'npx-skills',scope:'project',project,commit:source.commit,requested_ref:source.requested_ref,cli_version:CLI_VERSION,agent,legacy,roots,names:info.names,source:info.source,candidates,targets,watched,protected:protectedState(project),differences,blockers,global_skills:globalSkills,warnings:globalSkills.length?['Global ADF skills remain untouched. Confirm the Agent loads the selected project installation.']:[],git,guidances};
}
function backupDir(project,id){if(!/^[0-9a-f-]{36}$/.test(id))fail('Invalid backup ID');return safe(project,`.adf/v5-transfer-backups/${id}`);}
function copyEntry(src,dst){const st=fs.lstatSync(src);fs.mkdirSync(path.dirname(dst),{recursive:true});if(st.isSymbolicLink()){const link=fs.readlinkSync(src);fs.symlinkSync(link,dst,process.platform==='win32'?'dir':undefined);}else fs.cpSync(src,dst,{recursive:true,dereference:false});}
function removeEntry(p){if(exists(p))fs.rmSync(p,{recursive:true});}
function receipts(project){const p=safe(project,'.adf/v5-transfer.json');return exists(p)?readJSON(p):null;}
export function installWithNpx(stage,plan){
 const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<20))fail('skills@1.7.0 requires Node.js >=22.20.0');
 run('npx',['--yes',`skills@${plan.cli_version}`,'add',plan.source,'--skill','*','-a',plan.agent,'--copy','-y'],stage);
}
function verifyStage(stage,source,p){
 const lock=readJSON(path.join(stage,'skills-lock.json'));if(lock.version!==1||!lock.skills)fail('Unsupported npx lock');
 const folders={};for(const name of p.names){
  const choices=[AGENTS[p.agent],'.agents/skills'].map(r=>path.join(stage,r,name)).filter(fs.existsSync);
  if(!choices.length)fail(`npx did not install ${name}`);const f=choices[0];
  if(!equal(hashes(f),hashes(path.join(source.root,'skills',name))))fail(`Installed content differs from selected official source: ${name}`);
  const e=lock.skills[name];if(!e||e.source!==REPO||e.sourceType!=='github'||e.ref!==p.commit||e.skillPath!==`skills/${name}/SKILL.md`||e.computedHash!==folderHash(f))fail(`Invalid npx provenance: ${name}`);
  folders[name]=f;
 }
 return {lock,folders};
}
export function verify(project){
 project=path.resolve(project);const r=receipts(project);if(!r||r.status!=='verified')fail('No completed transfer record');
 const lock=readJSON(safe(project,'skills-lock.json'));
 for(const n of r.names){const entry=lock.skills[n];if(!equal(entry,r.lock_entries[n]))fail(`npx provenance changed: ${n}`);
  for(const root of [...new Set(['.agents/skills',AGENTS[r.agent]])]){const folder=safe(project,`${root}/${n}`);if(folderHash(folder)!==entry.computedHash)fail(`Installed skill changed: ${root}/${n}`);}
 }
 for(const rel of r.removed)if(exists(safe(project,rel,{leafLink:true})))fail(`Old manual skill remains: ${rel}`);
 if(!equal(hashes(safe(project,'framework/review')),r.review_hashes))fail('Review resources changed');
 return {status:'verified',version:'5.0.0',management:'npx-skills',scope:'project',commit:r.commit,backup:r.backup,subsequent_project_changes:!equal(protectedState(project),r.protected)};
}
export function apply(project,source,p,{confirmed=false,installer=installWithNpx}={}){
 project=path.resolve(project);if(!confirmed)fail('Confirm the concrete plan before replacement');
 if(p.tool!=='adf-v5-npx-transfer'||p.format!==1||p.project!==project||p.cli_version!==CLI_VERSION)fail('Invalid plan');
 const existing=receipts(project);if(existing){if(existing.commit!==source.commit||existing.agent!==p.agent)fail('A different transfer already exists');return {...verify(project),status:'already_transferred'};}
 const fresh=buildPlan(project,source,{agent:p.agent,legacy:p.legacy});if(!equal(fresh,p))fail('Stale/altered plan; run PLAN again');if(p.blockers.length)fail(p.blockers.join('\n'));
 const stage=fs.mkdtempSync(path.join(os.tmpdir(),'adf-v5-npx-'));
 try{
  // npx runs outside the project. Failed downloads cannot replace existing skills.
  installer(stage,p);const staged=verifyStage(stage,source,p);
  if(!equal(buildPlan(project,source,{agent:p.agent,legacy:p.legacy}),p))fail('Project changed while downloading; no files replaced');
  const id=crypto.randomUUID(),backup=backupDir(project,id);fs.mkdirSync(backup,{recursive:true});
  const originals={};for(const rel of p.targets){const file=safe(project,rel,{leafLink:rel.includes('/skills/')});originals[rel]=snapshotPath(file);if(exists(file))copyEntry(file,path.join(backup,'files',rel));}
  const record={format:1,adf_version:'5.0.0',management_from:'manual',management_to:'npx-skills',scope:'project',project,backup:id,commit:p.commit,targets:p.targets,originals,protected:p.protected,git:p.git,status:'prepared'};
  record.backup_hashes=snapshotPath(path.join(backup,'files'));
  fs.writeFileSync(path.join(backup,'record.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  const written={},changed=[];let result;
  function change(rel,action){const f=safe(project,rel,{leafLink:rel.includes('/skills/')});if(!equal(snapshotPath(f),originals[rel]))fail(`Concurrent change: ${rel}`);changed.push(rel);action(f);written[rel]=snapshotPath(f);}
  try{
   for(const n of p.names)for(const root of [...new Set(['.agents/skills',AGENTS[p.agent]])]){const rel=`${root}/${n}`;change(rel,f=>{removeEntry(f);copyEntry(staged.folders[n],f);});}
   change('framework/review',f=>{removeEntry(f);copyEntry(path.join(source.root,'framework/review'),f);});
   const oldLock=exists(safe(project,'skills-lock.json'))?readJSON(safe(project,'skills-lock.json')):{version:1,skills:{}};
   const merged={...oldLock,skills:{...oldLock.skills,...staged.lock.skills}};
   // Remove only obsolete entries explicitly included in the approved legacy cleanup.
   for(const rel of p.candidates){const name=path.basename(rel);if(!p.names.includes(name))delete merged.skills[name];}
   change('skills-lock.json',f=>fs.writeFileSync(f,JSON.stringify(merged,null,2)+'\n'));
   for(const rel of ['CLAUDE.md','AGENTS.md'])change(rel,f=>fs.writeFileSync(f,p.guidances[rel]));
   for(const n of p.names)for(const root of [...new Set(['.agents/skills',AGENTS[p.agent]])])if(folderHash(safe(project,`${root}/${n}`))!==merged.skills[n].computedHash)fail('Live installation validation failed');
   if(!equal(protectedState(project),p.protected))fail('Protected project content changed');
   const live=new Set(p.names.flatMap(n=>[`.agents/skills/${n}`,`${AGENTS[p.agent]}/${n}`]));
   const removed=p.candidates.filter(rel=>!live.has(rel));
   // Cleanup happens only after successful installation and content verification.
   for(const rel of removed)change(rel,removeEntry);
   result={...record,status:'verified',agent:p.agent,names:p.names,removed,lock_entries:Object.fromEntries(p.names.map(n=>[n,merged.skills[n]])),review_hashes:hashes(path.join(source.root,'framework/review')),after:written};
   fs.writeFileSync(safe(project,'.adf/v5-transfer.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   fs.writeFileSync(path.join(backup,'record.json'),JSON.stringify(result,null,2)+'\n');
   verify(project);return {status:'verified',backup:id,commit:p.commit};
  }catch(e){
   const conflicts=[];for(const rel of changed.reverse()){const f=safe(project,rel,{leafLink:rel.includes('/skills/')});
    if(written[rel]&&!equal(snapshotPath(f),written[rel])){conflicts.push(rel);continue;}
    removeEntry(f);if(originals[rel]!==null)copyEntry(path.join(backup,'files',rel),f);
   }
   const receipt=safe(project,'.adf/v5-transfer.json');if(exists(receipt)&&readJSON(receipt).backup===id)fs.unlinkSync(receipt);
   fail(`Transfer failed: ${e.message}. Backup ${id}; ${conflicts.length?'manual recovery required: '+conflicts.join(', '):'managed files restored'}`);
  }
 }finally{fs.rmSync(stage,{recursive:true,force:true});}
}
export function restore(project,id){
 project=path.resolve(project);const dir=backupDir(project,id),r=readJSON(path.join(dir,'record.json'));
 if(r.format!==1||r.project!==project||r.backup!==id||r.status!=='verified')fail('Invalid/incomplete recovery record; use preserved backup manually');
 if(!equal(snapshotPath(path.join(dir,'files')),r.backup_hashes))fail('Backup integrity mismatch');
 // Only known installer/legacy paths recorded by the tool are recoverable. No arbitrary file deletion.
 for(const rel of r.targets){if(!relative(rel)||(!['skills-lock.json','framework/review','CLAUDE.md','AGENTS.md'].includes(rel)&&!/^.+\/skills\/adf-[a-z0-9-]+$/.test(rel)))fail('Unsafe recovery path');
  if(/^(standards|modules|\.git|node_modules|\.adf)(\/|$)/.test(rel))fail('Protected recovery path');
  if(!equal(snapshotPath(safe(project,rel,{leafLink:rel.includes('/skills/')})),r.after[rel]))fail(`New changes prevent restore: ${rel}`);
 }
 const currentReceipt=receipts(project);if(!currentReceipt||currentReceipt.backup!==id)fail('Recovery record conflict');
 for(const rel of r.targets){const f=safe(project,rel,{leafLink:rel.includes('/skills/')});removeEntry(f);if(r.originals[rel]!==null)copyEntry(path.join(dir,'files',rel),f);}
 const receipt=safe(project,'.adf/v5-transfer.json');if(exists(receipt)){if(readJSON(receipt).backup!==id)fail('Recovery record conflict');fs.unlinkSync(receipt);}
 return {status:'restored',backup:id};
}
function options(args){const out={legacy:[]};for(let i=0;i<args.length;i++){const a=args[i];if(a==='--confirm'){out.confirm=true;continue;}if(!['--project','--ref','--agent','--legacy','--output','--plan','--backup'].includes(a)||!args[i+1])fail(`Unknown/missing option: ${a}`);const value=args[++i];if(a==='--legacy')out.legacy.push(value);else out[a.slice(2)]=value;}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let source;try{
  const [mode,...args]=process.argv.slice(2),o=options(args);if(!o.project)fail('Specify --project');const project=path.resolve(o.project);let result;
  if(mode==='VERIFY')result=verify(project);
  else if(mode==='RESTORE')result=restore(project,o.backup);
  else{
   const p=o.plan?readJSON(path.resolve(o.plan)):null;const ref=p?.commit||o.ref;if(!ref)fail('Specify --ref (v5.0 tag or commit)');source=fetchSource(ref);
   if(p)source.requested_ref=p.requested_ref;
   if(mode==='CHECK'||mode==='PLAN')result=buildPlan(project,source,{agent:o.agent,legacy:o.legacy});
   else if(mode==='APPLY'){
    if(!p)fail('Specify --plan');let confirmed=o.confirm;
    if(!confirmed&&process.stdin.isTTY){console.log(JSON.stringify(p.differences,null,2));console.log('Replacement/cleanup targets:',p.targets.join('\n'));const rl=readline.createInterface({input:process.stdin,output:process.stdout});confirmed=(await rl.question('Type REPLACE to apply this plan: '))==='REPLACE';rl.close();}
    result=apply(project,source,p,{confirmed});
   }else fail('Mode: CHECK / PLAN / APPLY / VERIFY / RESTORE');
  }
  const output=JSON.stringify(result,null,2)+'\n';if(o.output){const f=path.resolve(o.output);if(inside(project,f))fail('Plan output must be outside the project');fs.writeFileSync(f,output,{flag:'wx'});}else console.log(output);
  if(result.blockers?.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{source?.dispose();}
}
