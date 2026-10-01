// Compatibility entry: old init command now performs a read-only migration check.
import { plan } from '../skills/adf-project-install/scripts/project.mjs';
try {
 const result=plan(process.argv[2]||process.cwd());
 console.log(JSON.stringify(result,null,2));
 console.log('v5.1: use project-scoped npx skills, then adf-project-install PLAN/APPLY. This command wrote no files.');
 if(result.blockers.length)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
