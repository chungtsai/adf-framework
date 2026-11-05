// One-command updater for installed projects: npx is stubbed so the test runs offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const install=path.join(repo,'scripts/install.sh'),update=path.join(repo,'scripts/update.sh');
const skip=process.platform==='win32'||spawnSync('bash',['--version']).status!==0;
// Stub `npx skills add`: copy skills from ADF_SOURCE_DIR into .claude/skills and write skills-lock.json.
const stub=`#!/usr/bin/env node
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const src=path.join(process.env.ADF_SOURCE_DIR,'skills');
const version=JSON.parse(fs.readFileSync(path.join(src,'adf-project-install/references/release.json'))).version;
fs.appendFileSync(process.env.NPX_LOG,process.argv.slice(2).join(' ')+'\\n');
try{fs.readFileSync(0);}catch{}
// The lock records the requested tag (formal or pre-release), as npx skills does.
const tag=(process.argv.find(a=>a.includes('/tree/'))||'').split('/tree/')[1];
if(process.env.NPX_FAIL) process.exit(1);
const dst=path.join(process.cwd(),'.claude/skills');fs.mkdirSync(dst,{recursive:true});
const lock={version:1,skills:{}};
for(const name of fs.readdirSync(src)){
 fs.rmSync(path.join(dst,name),{recursive:true,force:true});
 fs.cpSync(path.join(src,name),path.join(dst,name),{recursive:true});
 if(process.env.NPX_SKIP&&process.env.NPX_SKIP.startsWith(name+'/')) fs.rmSync(path.join(dst,process.env.NPX_SKIP));
 const files=[];(function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);fs.statSync(f).isDirectory()?walk(f):files.push(path.relative(path.join(dst,name),f).split(path.sep).join('/'));}})(path.join(dst,name));
 const h=crypto.createHash('sha256');for(const rel of files.sort((a,b)=>a.localeCompare(b))){h.update(rel);h.update(fs.readFileSync(path.join(dst,name,rel)));}
 lock.skills[name]={source:'chungtsai/adf-framework',sourceType:'github',ref:tag||'v'+version,skillPath:'skills/'+name+'/SKILL.md',computedHash:h.digest('hex')};
}
fs.writeFileSync(path.join(process.cwd(),'skills-lock.json'),JSON.stringify(lock,null,2));
`;
const current=JSON.parse(fs.readFileSync(path.join(repo,'skills/adf-project-install/references/release.json'))).version;
// A fake next release: same skills, version bumped, still accepting the current project.yaml format.
function nextRelease(base,version,compatible){
 const dir=path.join(base,'next');fs.cpSync(path.join(repo,'skills'),path.join(dir,'skills'),{recursive:true});
 for(const name of fs.readdirSync(path.join(dir,'skills'))){
  const f=path.join(dir,'skills',name,'references/release.json');
  if(fs.existsSync(f)) fs.writeFileSync(f,JSON.stringify({...JSON.parse(fs.readFileSync(f)),version},null,2));
 }
 const r=path.join(dir,'skills/adf-project-install/references/resources.json');
 fs.writeFileSync(r,JSON.stringify({...JSON.parse(fs.readFileSync(r)),version,compatible_tool_versions:compatible},null,2));
 return dir;
}
function setup(t,{installed=true}={}){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'adf-update-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const bin=path.join(base,'bin'),project=path.join(base,'project'),home=path.join(base,'home'),log=path.join(base,'npx.log');
 for(const d of [bin,project,home]) fs.mkdirSync(d);
 fs.writeFileSync(path.join(bin,'npx'),stub,{mode:0o755});
 const env=extra=>({...process.env,PATH:`${bin}${path.delimiter}${process.env.PATH}`,HOME:home,NPX_LOG:log,ADF_SOURCE_DIR:repo,ADF_YES:'1',...extra});
 fs.writeFileSync(path.join(project,'README.md'),'app');
 if(installed){const r=spawnSync('bash',[install,'--project',project],{encoding:'utf8',env:env({})});assert.equal(r.status,0,r.stderr+r.stdout);fs.rmSync(log);}
 const run=(args=[],extra={})=>spawnSync('bash',[update,'--project',project,...args],{encoding:'utf8',env:env(extra)});
 const piped=(args=[],extra={})=>spawnSync('bash',['-s','--','--project',project,...args],{encoding:'utf8',input:fs.readFileSync(update),env:env(extra)});
 const npx=()=>fs.existsSync(log)?fs.readFileSync(log,'utf8'):'';
 const lockRefs=()=>[...new Set(Object.values(JSON.parse(fs.readFileSync(path.join(project,'skills-lock.json'))).skills).map(s=>s.ref))];
 return {base,project,run,piped,npx,lockRefs};
}
test('project without ADF is pointed to install.sh, nothing is written',{skip},t=>{
 const {project,run,npx}=setup(t,{installed:false});
 const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/尚未安裝 ADF.*install\.sh/);
 assert.equal(npx(),'');assert.deepEqual(fs.readdirSync(project),['README.md']);
});
test('already up to date: verifies and does not reinstall',{skip},t=>{
 const {run,npx}=setup(t);
 const r=run();assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,/已是最新/);assert.equal(npx(),'');
});
test('one command updates skills and lock to the new version, project files untouched',{skip},t=>{
 const {base,project,run,npx,lockRefs}=setup(t);
 fs.mkdirSync(path.join(project,'modules/a'),{recursive:true});fs.writeFileSync(path.join(project,'modules/a/spec.md'),'approved');
 const cfg=fs.readFileSync(path.join(project,'.adf/project.yaml'),'utf8');
 const src=nextRelease(base,'9.9.0',[current]);
 const r=run(['--version','9.9.0'],{ADF_SOURCE_DIR:src});assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(r.stdout,new RegExp(`v${current.replace(/\./g,'\\.')} → v9\\.9\\.0`));
 assert.match(npx(),/skills add https:\/\/github.com\/chungtsai\/adf-framework\/tree\/v9\.9\.0 --skill \* -a claude-code -y --copy/);
 assert.deepEqual(lockRefs(),['v9.9.0']);
 assert.equal(fs.readFileSync(path.join(project,'modules/a/spec.md'),'utf8'),'approved');
 assert.equal(fs.readFileSync(path.join(project,'.adf/project.yaml'),'utf8'),cfg);
});
test('curl | bash style update completes even when npx consumes stdin',{skip},t=>{
 const {base,piped,lockRefs}=setup(t);
 const r=piped(['--version','v9.9.0'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current])});
 assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,/通過 VERIFY/);assert.deepEqual(lockRefs(),['v9.9.0']);
});
test('locally modified skill stops the update before npx runs',{skip},t=>{
 const {base,project,run,npx}=setup(t);
 fs.appendFileSync(path.join(project,'.claude/skills/adf-ask/SKILL.md'),'\ncustom');
 const r=run(['--version','9.9.0'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current])});
 assert.notEqual(r.status,0);assert.match(r.stderr,/differs from npx lock/);assert.match(r.stderr,/--force/);assert.equal(npx(),'');
});
test('incompatible project configuration is refused before npx runs',{skip},t=>{
 const {base,run,npx}=setup(t);
 const r=run(['--version','9.9.0'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',['9.9.0'])});
 assert.notEqual(r.status,0);assert.match(r.stderr,/SOP/);assert.equal(npx(),'');
});
for(const [label,extra,pattern] of [
 ['incomplete installation',{NPX_SKIP:'adf-feature-init/references/release.json'},/缺少：.*adf-feature-init/],
 ['npx failure',{NPX_FAIL:'1'},/npx skills add 失敗/],
]) test(`${label} rolls back to the previous version`,{skip},t=>{
 const {base,project,run,lockRefs}=setup(t);
 const before=fs.readFileSync(path.join(project,'.claude/skills/adf-ask/references/release.json'),'utf8');
 const r=run(['--version','9.9.0'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current]),...extra});
 assert.notEqual(r.status,0);assert.match(r.stderr,pattern);assert.match(r.stderr,/已還原為 v/);
 assert.deepEqual(lockRefs(),[`v${current}`]);
 assert.equal(fs.readFileSync(path.join(project,'.claude/skills/adf-ask/references/release.json'),'utf8'),before);
});
test('update.ps1 does not pass double quotes inside arguments to native commands',()=>{
 const ps=fs.readFileSync(path.join(repo,'scripts/update.ps1'),'utf8').split(/\r?\n/);
 const bad=ps.map((l,i)=>[i+1,l]).filter(([,l])=>!l.trim().startsWith('#')&&/\b(node|npx|npm)(\.exe)?\s+[^#\n]*'[^']*"[^']*'/.test(l));
 assert.deepEqual(bad,[]);
});
test('without --yes and without a terminal, the update stops before any write',{skip},t=>{
 const {base,project,run,npx,lockRefs}=setup(t);
 const r=run(['--version','9.9.0'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current]),ADF_YES:''});
 assert.notEqual(r.status,0);assert.match(r.stdout,/即將更新/);assert.match(r.stderr,/--yes/);assert.equal(npx(),'');assert.deepEqual(lockRefs(),[`v${current}`]);
});
test('install.sh on an installed project forwards to update.sh with the same options',{skip},t=>{
 const {base,project,npx,lockRefs}=setup(t);
 const bin=path.join(base,'bin');
 const r=spawnSync('bash',[install,'--project',project,'--version','9.9.0','--yes'],{encoding:'utf8',env:{...process.env,PATH:`${bin}${path.delimiter}${process.env.PATH}`,HOME:path.join(base,'home'),NPX_LOG:path.join(base,'npx.log'),ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current])}});
 assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,/改執行一鍵更新/);assert.match(npx(),/tree\/v9\.9\.0/);assert.deepEqual(lockRefs(),['v9.9.0']);
});
test('beta tag installs for testing, then the formal tag of the same version replaces it',{skip},t=>{
 const {base,run,npx,lockRefs}=setup(t);
 const src=nextRelease(base,'9.9.0',[current]);
 let r=run(['--version','v9.9.0-beta.1'],{ADF_SOURCE_DIR:src});assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(r.stdout,/測試版/);assert.match(npx(),/tree\/v9\.9\.0-beta\.1/);assert.deepEqual(lockRefs(),['v9.9.0-beta.1']);
 r=run(['--version','v9.9.0-beta.1'],{ADF_SOURCE_DIR:src});assert.equal(r.status,0,r.stderr+r.stdout);assert.match(r.stdout,/已是最新：v9\.9\.0-beta\.1/);
 r=run(['--version','v9.9.0'],{ADF_SOURCE_DIR:src});assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(r.stdout,/v9\.9\.0-beta\.1 → v9\.9\.0/);assert.doesNotMatch(r.stdout,/測試版/);assert.deepEqual(lockRefs(),['v9.9.0']);
});
test('beta tag whose source content is a different version is refused before npx runs',{skip},t=>{
 const {base,run,npx,lockRefs}=setup(t);
 const r=run(['--version','v9.8.0-beta.1'],{ADF_SOURCE_DIR:nextRelease(base,'9.9.0',[current])});
 assert.notEqual(r.status,0);assert.match(r.stderr,/原始檔版本為 9\.9\.0/);assert.equal(npx(),'');assert.deepEqual(lockRefs(),[`v${current}`]);
});
test('unsupported pre-release label is refused before any check',{skip},t=>{
 const {run,npx}=setup(t);
 const r=run(['--version','v9.9.0-alpha.1']);assert.notEqual(r.status,0);assert.match(r.stderr,/版本格式不正確/);assert.equal(npx(),'');
});
test('update.ps1 and install.ps1 accept the same version formats as the shell scripts',()=>{
 for(const f of ['update.ps1','install.ps1']){const s=fs.readFileSync(path.join(repo,'scripts',f),'utf8');assert.match(s,/\(-\(beta\|rc\)\\\.\[1-9\]\\d\*\)\?\$/,f);}
 assert.match(fs.readFileSync(path.join(repo,'scripts/update.ps1'),'utf8'),/\$currentRef -eq \$Version/);
});
