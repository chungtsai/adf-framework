"""Build the standalone v5.0 manual-to-npx transfer kit (no third-party dependencies)."""
from pathlib import Path
import argparse, hashlib, json, zipfile
root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
readme = '''# ADF v5.0 手動導入轉接包\n\n功能版本維持 5.0.0；管理方式 manual → npx-skills，驗證通過為 verified。\n\n先閱讀 docs/migrations/manual-v5-to-npx-v5.md。此包只提供轉接程式、SOP與網路驗收程式；官方32支 Skill由 npx下載。不是首次初始化套件，也不是v5.1升級包。\n\n需求：Node.js >=22.20.0、Git、npm/npx、GitHub及npm網路。請解壓到目標專案外。\n\n依序執行 CHECK、PLAN、APPLY、VERIFY；確認具體差異後才替換。\n官方來源請選原本使用的v5.0 tag/commit；文件提供已確認的範例commit。\n\n下載/驗證失敗不動舊版，所有替換目標先備份。保留standards、modules、.adf/templates與核准狀態。\n回復使用RESTORE，不執行git reset --hard。\n\n如需重跑實際網路驗收：npm run test:live。此命令只建立暫存專案，不修改你的專案。\n'''
files = {
 'README.md': readme.encode(),
 'scripts/migrate-v5-installation.mjs': (root/'scripts/migrate-v5-installation.mjs').read_bytes(),
 'docs/migrations/manual-v5-to-npx-v5.md': (root/'docs/migrations/manual-v5-to-npx-v5.md').read_bytes(),
 'tests/v5-installation-live.mjs': (root/'tests/v5-installation-live.mjs').read_bytes(),
 'LICENSE': (root/'LICENSE').read_bytes(),
 'package.json': (json.dumps({'name':'adf-v5-manual-transfer-kit','version':'1.0.0','private':True,'type':'module','adf_version':'5.0.0','engines':{'node':'>=22.20.0'},'scripts':{'test:live':'node tests/v5-installation-live.mjs'}},indent=2)+'\n').encode()
}
manifest = {'kit_version':'1.0.0','adf_version':'5.0.0','management_from':'manual','management_to':'npx-skills','scope':'project','skills_cli_version':'1.7.0','files':{p:hashlib.sha256(b).hexdigest() for p,b in files.items()}}
files['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
args.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED) as z:
 for p,b in files.items():
  info=zipfile.ZipInfo('adf-v5-manual-transfer-kit/'+p, (2026,10,2,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,b)
with zipfile.ZipFile(args.output) as z:
 assert z.testzip() is None
 for p,digest in manifest['files'].items():assert hashlib.sha256(z.read('adf-v5-manual-transfer-kit/'+p)).hexdigest()==digest
print(json.dumps({'file':str(args.output.resolve()),'files':len(files),'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))
