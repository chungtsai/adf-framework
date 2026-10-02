// Explicit opt-in integration test. Downloads official GitHub source and skills@1.7.0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fetchSource,buildPlan,apply,verify,restore} from '../scripts/migrate-v5-installation.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'adf-v5-live-'));let source;
try{
 source=fetchSource('d2796046d0876297034ddc1610d86258d1b11408');
 fs.mkdirSync(path.join(root,'.codex'),{recursive:true});fs.cpSync(path.join(source.root,'skills'),path.join(root,'.codex/skills'),{recursive:true});
 for(const p of ['modules/a/manifest.yaml','standards/custom.md','.adf/templates/custom.md']){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),'PRESERVE\n');}
 const p=buildPlan(root,source),r=apply(root,source,p,{confirmed:true});assert.equal(verify(root).status,'verified');
 for(const f of ['modules/a/manifest.yaml','standards/custom.md','.adf/templates/custom.md'])assert.equal(fs.readFileSync(path.join(root,f),'utf8'),'PRESERVE\n');
 restore(root,r.backup);assert.ok(fs.existsSync(path.join(root,'.codex/skills/adf-develop/SKILL.md')));
 console.log('Actual npx install/provenance, 32 skills, project preservation and restore passed.');
}finally{source?.dispose();fs.rmSync(root,{recursive:true,force:true});}
