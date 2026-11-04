// Starter standards: project.mjs STANDARDS and the one-click standards.sh wrapper (offline, sources from this repo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {standardsList,standardsInstall} from '../skills/adf-project-install/scripts/project.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(repo,'scripts/standards.sh');
const skipSh=process.platform==='win32'||spawnSync('bash',['--version']).status!==0;
const read=(r,p)=>fs.readFileSync(path.join(r,p),'utf8');
const write=(r,p,c)=>{fs.mkdirSync(path.dirname(path.join(r,p)),{recursive:true});fs.writeFileSync(path.join(r,p),c);};
function project(t,installed=true){
 const r=fs.mkdtempSync(path.join(os.tmpdir(),'adf-std-'));t.after(()=>fs.rmSync(r,{recursive:true,force:true}));
 if(installed) write(r,'.adf/migration.json','{"status":"verified"}');return r;
}
const sh=(r,args,extra={})=>spawnSync('bash',[script,'--project',r,...args],{encoding:'utf8',env:{...process.env,ADF_SOURCE_DIR:repo,ADF_YES:'',...extra}});

test('every pack lists the official standards it installs',t=>{
 const l=standardsList(project(t));
 assert.deepEqual(l.packs.map(p=>p.id),['date','display-parity','shared-message','sql-injection','data-scope']);
 assert.ok(l.packs.every(p=>p.state==='available'&&p.standards.every(s=>s.id&&s.target.startsWith('standards/'))));
 assert.deepEqual(l.packs[0].standards.map(s=>s.id),['DEV-DATE-001','MIG-DATE-001']);
});
test('selected packs are written as DRAFT with their source, nothing else changes',t=>{
 const r=project(t);const res=standardsInstall(r,['date','data-scope'],{ref:'main'});
 assert.deepEqual(res.written.map(w=>w.target),['standards/development/date-time.md','standards/migration/roc-calendar.md','standards/development/security/data-scope.md']);
 const text=read(r,'standards/development/security/data-scope.md');
 assert.match(text,/^status: DRAFT$/m);assert.match(text,/^source: adf-framework\/standard\/development\/security\/data-scope\.md@main$/m);assert.doesNotMatch(text,/approved_at/);
 assert.ok(!fs.existsSync(path.join(r,'standards/development/message.md')));
 assert.deepEqual(standardsList(r).packs.map(p=>p.state),['installed','available','available','available','installed']);
});
test('APPROVED records when and how it was approved',t=>{
 const r=project(t);standardsInstall(r,['sql-injection'],{status:'APPROVED',date:'2026-11-04'});
 const text=read(r,'standards/development/security/sql-injection.md');
 assert.match(text,/^status: APPROVED$/m);assert.match(text,/^approved_at: 2026-11-04$/m);assert.match(text,/^approved_via: /m);
});
test('existing project standards are never overwritten, including the same ID under another name',t=>{
 const r=project(t);write(r,'standards/development/date-time.md','# Project date rule\nCUSTOM');write(r,'standards/roc.md','# MIG-DATE-001\nOld example copy');
 const res=standardsInstall(r,['date']);
 assert.equal(res.status,'nothing_to_install');assert.equal(res.skipped.length,2);assert.match(res.skipped[1].reason,/standards\/roc\.md/);
 assert.equal(read(r,'standards/development/date-time.md'),'# Project date rule\nCUSTOM');
 const again=standardsInstall(project(t),['shared-message']);assert.equal(again.written.length,1);
});
test('a second run skips what is already installed',t=>{
 const r=project(t);standardsInstall(r,['shared-message']);write(r,'standards/development/message.md',read(r,'standards/development/message.md')+'\n專案補充');
 const res=standardsInstall(r,['shared-message','display-parity']);
 assert.deepEqual(res.skipped.map(s=>s.reason),['already installed']);assert.match(read(r,'standards/development/message.md'),/專案補充/);
});
test('invalid requests are refused before any write',t=>{
 const r=project(t);
 assert.throws(()=>standardsInstall(r,['nope']),/Unknown standard pack/);
 assert.throws(()=>standardsInstall(r,['date'],{status:'OK'}),/DRAFT or APPROVED/);
 assert.throws(()=>standardsInstall(r,[]),/at least one/);
 assert.throws(()=>standardsInstall(project(t,false),['date']),/not installed/);
 assert.ok(!fs.existsSync(path.join(r,'standards')));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'adf-out-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 fs.symlinkSync(outside,path.join(r,'standards'),'dir');assert.throws(()=>standardsInstall(r,['date']),/Symlink/);assert.deepEqual(fs.readdirSync(outside),[]);
});
test('standards.sh installs selected numbers non-interactively as DRAFT',{skip:skipSh},t=>{
 const r=project(t);const res=sh(r,['--select','1,4','--yes']);assert.equal(res.status,0,res.stderr+res.stdout);
 assert.match(res.stdout,/\[1\] 年度/);assert.match(res.stdout,/已寫入：standards\/development\/security\/sql-injection\.md/);
 assert.match(read(r,'standards/migration/roc-calendar.md'),/^status: DRAFT$/m);assert.ok(!fs.existsSync(path.join(r,'standards/development/message.md')));
});
test('standards.sh accepts pack IDs and --status APPROVED',{skip:skipSh},t=>{
 const r=project(t);const res=sh(r,['--select','data-scope','--status','APPROVED','--yes']);assert.equal(res.status,0,res.stderr+res.stdout);
 assert.match(read(r,'standards/development/security/data-scope.md'),/^status: APPROVED$/m);
});
test('standards.sh without a terminal or selection writes nothing',{skip:skipSh},t=>{
 const r=project(t);
 const a=sh(r,[]);assert.notEqual(a.status,0);assert.match(a.stderr,/--select/);
 const b=sh(r,['--select','2']);assert.notEqual(b.status,0);assert.match(b.stderr,/--yes/);assert.match(b.stdout,/display-parity\.md/);
 const c=sh(r,['--select','9','--yes']);assert.notEqual(c.status,0);
 assert.ok(!fs.existsSync(path.join(r,'standards')));
});
test('standards.sh requires an installed ADF project and supports --list',{skip:skipSh},t=>{
 const a=sh(project(t,false),['--list']);assert.notEqual(a.status,0);assert.match(a.stderr,/尚未安裝 ADF/);
 const r=project(t);const b=sh(r,['--list']);assert.equal(b.status,0,b.stderr);assert.match(b.stdout,/\[5\] 資料範圍保護/);assert.ok(!fs.existsSync(path.join(r,'standards')));
});
test('standards.ps1 does not pass double quotes inside arguments to native commands',()=>{
 const ps=fs.readFileSync(path.join(repo,'scripts/standards.ps1'),'utf8').split(/\r?\n/);
 const bad=ps.map((l,i)=>[i+1,l]).filter(([,l])=>!l.trim().startsWith('#')&&/\b(node|npx|npm)(\.exe)?\s+[^#\n]*'[^']*"[^']*'/.test(l));
 assert.deepEqual(bad,[]);
});
