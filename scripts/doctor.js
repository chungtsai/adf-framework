import { plan } from '../skills/adf-project-install/scripts/project.mjs';
try {
 const result=plan(process.argv[2]||process.cwd());
 console.log(JSON.stringify(result,null,2));
 if(result.blockers.length)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
