#!/usr/bin/env bash
# ADF 專案起始規範一鍵安裝（macOS / Linux）
#
# 適用：已安裝 ADF（有 .adf/migration.json）的專案。選擇要採用的起始規範，寫入專案 standards/。
# 只新增檔案；既有同路徑或同 ID 的規範一律略過，不覆蓋。不修改 Skill、modules/、.adf/。
# 規範分兩類：建議項目預設全部安裝，輸入編號排除；選填項目輸入編號才安裝。
#
# 用法（在專案根目錄）：
#   curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/standards.sh | bash
#   bash standards.sh [--recommended] [--exclude 8,xss] [--add 19,date] [--status DRAFT|APPROVED] [--list] [--yes] [--project <dir>] [--ref main]
#   bash standards.sh --select date,sql-injection|1,4   # 只安裝指定項目（不套用建議項目）
# 沒有選擇參數時以編號互動選擇；寫入前會列出摘要並詢問確認；--yes 或 ADF_YES=1 可略過（CI 使用）。
set -euo pipefail

# 整支包在 main()：curl | bash 時先讀完整支腳本，避免互動讀取吃到尚未執行的內容。
main() {

REF="${ADF_REF:-main}"
PROJECT="."
SELECT=""
EXCLUDE=""
ADD=""
RECOMMENDED=""
STATUS=""
LIST_ONLY=""
YES="${ADF_YES:-}"

say()  { printf '[ADF] %s\n' "$*"; }
fail() { printf '[ADF] 停止：%s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --select)  SELECT="${2:?--select 需要值}"; shift 2 ;;
    --exclude) EXCLUDE="${2:?--exclude 需要值}"; RECOMMENDED=1; shift 2 ;;
    --add)     ADD="${2:?--add 需要值}"; RECOMMENDED=1; shift 2 ;;
    --recommended) RECOMMENDED=1; shift ;;
    --status)  STATUS="${2:?--status 需要值}"; shift 2 ;;
    --approve) STATUS="APPROVED"; shift ;;
    --project) PROJECT="${2:?--project 需要值}"; shift 2 ;;
    --ref)     REF="${2:?--ref 需要值}"; shift 2 ;;
    --list)    LIST_ONLY=1; shift ;;
    -y|--yes)  YES=1; shift ;;
    -h|--help) sed -n '2,13p' "$0" 2>/dev/null || true; exit 0 ;;
    *) fail "未知參數：$1" ;;
  esac
done
[ -z "$SELECT" ] || [ -z "$RECOMMENDED" ] || fail "--select 不能與 --recommended、--exclude、--add 同時使用"
case "$STATUS" in ""|DRAFT|APPROVED) ;; draft) STATUS=DRAFT ;; approved) STATUS=APPROVED ;; *) fail "--status 只能是 DRAFT 或 APPROVED" ;; esac

# 1. 前置條件
command -v node >/dev/null 2>&1 || fail "找不到 Node.js；請安裝 Node.js 18 以上版本"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 版本為 $(node -v)，需要 18 以上"
[ -d "$PROJECT" ] || fail "專案目錄不存在：$PROJECT"
cd "$PROJECT"
PROJECT="$(pwd -P)"
[ "$PROJECT" != "$(cd ~ && pwd -P)" ] || fail "不可直接在 home 目錄執行；請在專案根目錄執行"
[ -f .adf/migration.json ] || fail "此專案尚未安裝 ADF。請先執行一鍵安裝：curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.sh | bash"

# 2. 取得規範來源（專案外暫存）
WORK="$(mktemp -d "${TMPDIR:-/tmp}/adf-standards.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
SRC="${ADF_SOURCE_DIR:-}"
if [ -z "$SRC" ]; then
  command -v curl >/dev/null 2>&1 || fail "找不到 curl"
  command -v tar  >/dev/null 2>&1 || fail "找不到 tar"
  say "下載規範來源（$REF）"
  mkdir -p "$WORK/src"
  curl -fsSL "https://codeload.github.com/chungtsai/adf-framework/tar.gz/$REF" \
    | tar -xz -C "$WORK/src" --strip-components=1 || fail "無法下載 $REF；請確認分支或 tag 存在且網路可連到 GitHub"
  SRC="$WORK/src"
fi
TOOL="$SRC/skills/adf-project-install/scripts/project.mjs"
[ -f "$TOOL" ] && [ -f "$SRC/skills/adf-project-install/references/standard-packs.json" ] || fail "來源 $REF 沒有起始規範（需要包含 standard-packs.json 的版本）"
node "$TOOL" STANDARDS "$PROJECT" > "$WORK/list.json" || fail "無法讀取起始規範清單"

# 3. 列出可選規範
STATE_LABEL='{"available":"可安裝","installed":"已安裝","conflict":"已有同名規範，略過"}'
node -e '
const l=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),lab=JSON.parse(process.argv[2]);
const head={recommended:"建議項目（預設全部安裝；不需要的輸入編號排除）",optional:"選填項目（輸入編號才安裝）"};let cat="";
l.packs.forEach((p,i)=>{if(p.category!==cat){cat=p.category;console.log(`[ADF] ${head[cat]}：`);}
 console.log(`  [${i+1}] ${p.title}（${lab[p.state]}）`);console.log(`      ${p.summary}`);
 console.log(`      適用：${p.applies.join("、")}；寫入：${p.standards.map(s=>s.target+(s.state==="available"?"":"（"+lab[s.state]+(s.existing?"："+s.existing:"")+"）")).join("、")}`);});
' "$WORK/list.json" "$STATE_LABEL"
[ -z "$LIST_ONLY" ] || exit 0

# 4. 選擇：建議項目以編號排除，選填項目以編號加入（或 --select 指定完整清單）
if [ -z "$SELECT" ] && [ -z "$RECOMMENDED" ]; then
  { : </dev/tty; } 2>/dev/null || fail "無法互動選擇（沒有終端機）；請用 --recommended、--exclude、--add 或 --select 指定，例如 --recommended --add date"
  printf '[ADF] 要排除的建議項目編號（逗號或空白分隔；直接 Enter＝全部安裝；all＝全部不裝）：' >/dev/tty
  read -r EXCLUDE </dev/tty || EXCLUDE=""
  printf '[ADF] 要加入的選填項目編號（逗號或空白分隔；直接 Enter＝不加入；all＝全部加入）：' >/dev/tty
  read -r ADD </dev/tty || ADD=""
  RECOMMENDED=1
fi
set -- --dry-run
if [ -n "$SELECT" ]; then set -- "$@" --select "$SELECT"
else
  set -- "$@" --recommended
  [ -z "${EXCLUDE// /}" ] || set -- "$@" --exclude "$EXCLUDE"
  [ -z "${ADD// /}" ] || set -- "$@" --add "$ADD"
fi
node "$TOOL" STANDARDS "$PROJECT" "$@" > "$WORK/plan.json" || fail "選擇無效，請重新執行"
IDS="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).ids.join(","))' "$WORK/plan.json")"

# 5. 寫入狀態
if [ -z "$STATUS" ]; then
  if [ -n "$YES" ] || ! { : </dev/tty; } 2>/dev/null; then STATUS="DRAFT"
  else
    say "寫入狀態："
    say "  [1] DRAFT：之後用 adf-standard-authoring／adf-migration-rule-authoring 審查後再核准（建議）"
    say "  [2] APPROVED：我已審閱內容，直接作為專案核准規範"
    printf '[ADF] 請選擇 [1/2]（預設 1）：' >/dev/tty
    read -r ans </dev/tty || ans=""
    case "$ans" in 2) STATUS="APPROVED" ;; ""|1) STATUS="DRAFT" ;; *) fail "請輸入 1 或 2" ;; esac
  fi
fi

# 6. 寫入前確認
node -e '
const fs=require("fs"),l=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),pl=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
console.log("[ADF] 已選擇：");for(const id of pl.ids){const i=l.packs.findIndex(p=>p.id===id);console.log(`        [${i+1}] ${l.packs[i].title}`);}
console.log(`[ADF] 即將以 ${process.argv[3]} 狀態寫入 ${process.argv[4]}：`);
for(const s of pl.standards){if(s.state==="available") console.log(`        + ${s.target}（${s.id}）`); else console.log(`        - 略過 ${s.target}（${s.state==="installed"?"已安裝":"已有同名規範"+(s.existing?"："+s.existing:"")}）`);}
if(!pl.write){console.log("[ADF] 選擇的規範都已存在，沒有需要寫入的檔案。");process.exit(3);}
' "$WORK/list.json" "$WORK/plan.json" "$STATUS" "$PROJECT" || { [ $? -eq 3 ] && exit 0; fail "無法產生摘要"; }
say "只新增上列檔案，不覆蓋既有規範，不修改 Skill、modules/、.adf/"
if [ -z "$YES" ]; then
  { : </dev/tty; } 2>/dev/null || fail "無法互動確認（沒有終端機）；確認要執行請加 --yes 或設定 ADF_YES=1"
  printf '[ADF] 確定要繼續嗎？[y/N] ' >/dev/tty
  read -r ans </dev/tty || ans=""
  case "$ans" in y|Y|yes|YES) ;; *) say "已取消，未寫入任何檔案。"; exit 0 ;; esac
fi

# 7. 寫入
node "$TOOL" STANDARDS "$PROJECT" "$IDS" --status "$STATUS" --ref "$REF" > "$WORK/result.json" || fail "寫入失敗"
node -e '
const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
for(const w of r.written) console.log(`[ADF] 已寫入：${w.target}（${w.id}，${w.status}）`);
for(const s of r.skipped) console.log(`[ADF] 略過：${s.target}（${s.reason==="already installed"?"已安裝":s.reason.replace(/^conflict with /,"已有同名規範：")}）`);' "$WORK/result.json"
say "完成。建議 commit：standards/"
if [ "$STATUS" = "DRAFT" ]; then
  say "下一步：在 Agent 中請 adf-standard-authoring（DEV-*）與 adf-migration-rule-authoring（MIG-*）審查 DRAFT 規範，核准後改為 APPROVED。"
else
  say "下一步：在 Agent 中以 adf-standards-applicability 判斷各 Module 適用哪些規範。"
fi
}

main "$@"
