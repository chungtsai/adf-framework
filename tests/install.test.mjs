// One-click installer for fresh projects: npx is stubbed so the test runs offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(repo,'scripts/install.sh');
const skip=process.platform==='win32'||spawnSync('bash',['--version']).status!==0;
// Stub `npx skills add` with what a project-scoped copy install produces: skills + skills-lock.json.
const stub=`#!/usr/bin/env node
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=${JSON.stringify(repo)},version=JSON.parse(fs.readFileSync(path.join(repo,'skills/adf-project-install/references/release.json'))).version;
fs.appendFileSync(process.env.NPX_LOG,process.argv.slice(2).join(' ')+'\\n');
try{fs.readFileSync(0);}catch{} // real npx reads stdin; under curl | bash that is the rest of the script

const dst=path.join(process.cwd(),'.claude/skills');fs.mkdirSync(dst,{recursive:true});
const lock={version:1,skills:{}};
for(const name of fs.readdirSync(path.join(repo,'skills'))){
 fs.cpSync(path.join(repo,'skills',name),path.join(dst,name),{recursive:true});
 if(process.env.NPX_SKIP&&process.env.NPX_SKIP.startsWith(name+'/')) fs.rmSync(path.join(dst,process.env.NPX_SKIP));
 const files=[];(function walk(p){for(const n of fs.readdirSync(p)){const f=path.join(p,n);fs.statSync(f).isDirectory()?walk(f):files.push(path.relative(path.join(dst,name),f).split(path.sep).join('/'));}})(path.join(dst,name));
 const h=crypto.createHash('sha256');for(const rel of files.sort((a,b)=>a.localeCompare(b))){h.update(rel);h.update(fs.readFileSync(path.join(dst,name,rel)));}
 lock.skills[name]={source:'chungtsai/adf-framework',sourceType:'github',ref:'v'+version,skillPath:'skills/'+name+'/SKILL.md',computedHash:h.digest('hex')};
}
fs.writeFileSync(path.join(process.cwd(),'skills-lock.json'),JSON.stringify(lock,null,2));
`;
function setup(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'adf-install-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const bin=path.join(base,'bin'),project=path.join(base,'project');fs.mkdirSync(bin);fs.mkdirSync(project);
 fs.writeFileSync(path.join(bin,'npx'),stub,{mode:0o755});
 const home=path.join(base,'home');fs.mkdirSync(home);
 const env=extra=>({...process.env,PATH:`${bin}${path.delimiter}${process.env.PATH}`,HOME:home,NPX_LOG:path.join(base,'npx.log'),ADF_SOURCE_DIR:repo,ADF_YES:'1',...extra});
 const piped=()=>spawnSync('bash',['-s','--','--project',project],{encoding:'utf8',input:fs.readFileSync(script),env:env({})});
 const run=(extra={})=>spawnSync('bash',[script,'--project',project],{encoding:'utf8',env:env(extra)});
 return {base,project,run,piped};
}
test('fresh project installs, plans, applies and verifies in one command',{skip},t=>{
 const {base,project,run}=setup(t);fs.writeFileSync(path.join(project,'README.md'),'app');
 const r=run();assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(fs.readFileSync(path.join(base,'npx.log'),'utf8'),/skills add https:\/\/github.com\/chungtsai\/adf-framework\/tree\/v\d+\.\d+\.\d+ --skill \* -a claude-code -y/);
 const cfg=JSON.parse(fs.readFileSync(path.join(project,'.adf/project.yaml')));assert.equal(cfg.document_schema,'5.1');
 assert.equal(JSON.parse(fs.readFileSync(path.join(project,'.adf/migration.json'))).status,'verified');
 assert.equal(fs.readFileSync(path.join(project,'README.md'),'utf8'),'app');
 // Same command on an installed project routes to the updater automatically.
 const again=run();assert.equal(again.status,0,again.stderr+again.stdout);assert.match(again.stdout,/已安裝 ADF，改執行一鍵更新/);assert.match(again.stdout,/已是最新/);
});
for(const [label,prepare] of [
 ['legacy modules',p=>fs.mkdirSync(path.join(p,'modules/a'),{recursive:true})],
 ['legacy .adf templates',p=>fs.mkdirSync(path.join(p,'.adf/templates'),{recursive:true})],
 ['manual Codex skill',p=>fs.mkdirSync(path.join(p,'.codex/skills/adf-ask'),{recursive:true})],
 ['old framework reference',p=>fs.writeFileSync(path.join(p,'CLAUDE.md'),'Read framework/review/approval-gate.md')],
]) test(`non-fresh project (${label}) is refused before npx runs`,{skip},t=>{
 const {base,project,run}=setup(t);prepare(project);
 const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/不是全新專案/);
 assert.ok(!fs.existsSync(path.join(base,'npx.log')));assert.ok(!fs.existsSync(path.join(project,'skills-lock.json')));
});
test('installation missing a skill script is detected before any .adf write',{skip},t=>{
 const {project,run}=setup(t);
 const r=run({NPX_SKIP:'adf-feature-init/references/release.json'});assert.notEqual(r.status,0);
 assert.match(r.stderr,/缺少：.*adf-feature-init\/references\/release\.json/);assert.ok(!fs.existsSync(path.join(project,'.adf')));
});
test('curl | bash style execution completes even when npx consumes stdin',{skip},t=>{
 const {project,piped}=setup(t);const r=piped();assert.equal(r.status,0,r.stderr+r.stdout);
 assert.match(r.stdout,/通過 VERIFY/);assert.equal(JSON.parse(fs.readFileSync(path.join(project,'.adf/migration.json'))).status,'verified');
});
test('install.ps1 does not pass double quotes inside arguments to native commands (stripped by Windows PowerShell 5.1)',()=>{
 const ps=fs.readFileSync(path.join(repo,'scripts/install.ps1'),'utf8').split(/\r?\n/);
 const bad=ps.map((l,i)=>[i+1,l]).filter(([,l])=>!l.trim().startsWith('#')&&/\b(node|npx|npm)(\.exe)?\s+[^#\n]*'[^']*"[^']*'/.test(l));
 assert.deepEqual(bad,[],'Windows PowerShell 5.1 會去掉傳給外部程式參數中的雙引號；請改在 PowerShell 內處理');
});
test('without --yes and without a terminal, nothing is written',{skip},t=>{
 const {base,project,run}=setup(t);
 const r=run({ADF_YES:''});assert.notEqual(r.status,0);assert.match(r.stderr,/--yes/);assert.match(r.stdout,/即將安裝/);
 assert.ok(!fs.existsSync(path.join(base,'npx.log')));assert.ok(!fs.existsSync(path.join(project,'.adf')));
});
