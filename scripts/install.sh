#!/usr/bin/env bash
# ADF 全新專案一鍵安裝（macOS / Linux）
#
# 只適用「從未使用過 ADF」的專案：安裝前先檢查，發現任何舊版 ADF 痕跡就停止，
# 改走 docs/upgrades/ 的移轉 SOP。不寫入 standards/、modules/、CLAUDE.md、AGENTS.md。
#
# 用法（在專案根目錄）：
#   curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.sh | bash
#   或下載整包後執行（見 README「全新專案：一鍵安裝」）
#   bash install.sh [--agent claude-code|codex|...] [--version v5.4.0] [--copy] [--yes] [--project <dir>]
# 已安裝 ADF 的專案會自動改執行 update.sh（同一個指令即可更新）。
# 寫入任何檔案前會列出摘要並詢問確認；--yes 或 ADF_YES=1 可略過（CI 使用）。
set -euo pipefail

# 整支包在 main()：用 curl | bash 執行時，bash 會先讀完整支腳本再執行，
# 避免子程序（如 npx）讀走 stdin 中尚未執行的腳本內容。
main() {

REPO="https://github.com/chungtsai/adf-framework"
VERSION="${ADF_VERSION:-v5.4.0}"
AGENT="${ADF_AGENT:-claude-code}"
PROJECT="."
COPY=""
YES="${ADF_YES:-}"
FWD=()   # 轉交給 update.sh 的參數

say()  { printf '[ADF] %s\n' "$*"; }
fail() { printf '[ADF] 停止：%s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:?--agent 需要值}"; FWD+=(--agent "$2"); shift 2 ;;
    --version) VERSION="${2:?--version 需要值}"; FWD+=(--version "$2"); shift 2 ;;
    --project) PROJECT="${2:?--project 需要值}"; shift 2 ;;
    --copy)    COPY="--copy"; FWD+=(--copy); shift ;;
    -y|--yes)  YES=1; shift ;;
    -h|--help) sed -n '2,13p' "$0" 2>/dev/null || true; exit 0 ;;
    *) fail "未知參數：$1" ;;
  esac
done
case "$VERSION" in v*) ;; *) VERSION="v$VERSION" ;; esac

# 1. 前置條件
command -v node >/dev/null 2>&1 || fail "找不到 Node.js；請安裝 Node.js 18 以上版本"
command -v npx  >/dev/null 2>&1 || fail "找不到 npx；請安裝含 npm 的 Node.js"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 版本為 $(node -v)，需要 18 以上"
[ -d "$PROJECT" ] || fail "專案目錄不存在：$PROJECT"
cd "$PROJECT"
PROJECT="$(pwd -P)"
[ "$PROJECT" != "$(cd ~ && pwd -P)" ] || fail "不可直接安裝在 home 目錄；請在專案根目錄執行"

# 2. 全新專案檢查（任何一項存在都代表已用過 ADF，需走移轉 SOP）
if [ -f .adf/migration.json ]; then
  # 已安裝：自動改走一鍵更新（同一個指令）
  say "此專案已安裝 ADF，改執行一鍵更新"
  [ -n "$YES" ] && FWD+=(--yes)
  UPDATER=""
  SELF="${BASH_SOURCE[0]:-}"
  if [ -n "$SELF" ] && [ -f "$SELF" ] && [ -f "$(dirname "$SELF")/update.sh" ]; then
    UPDATER="$(cd "$(dirname "$SELF")" && pwd -P)/update.sh"
  else
    command -v curl >/dev/null 2>&1 || fail "找不到 curl"
    UPDATER="$(mktemp "${TMPDIR:-/tmp}/adf-update.XXXXXX")"
    trap 'rm -f "$UPDATER"' EXIT
    curl -fsSL "https://raw.githubusercontent.com/chungtsai/adf-framework/${ADF_REF:-main}/scripts/update.sh" -o "$UPDATER" \
      || fail "無法下載 update.sh；請確認網路可連到 GitHub"
  fi
  status=0
  bash "$UPDATER" "${FWD[@]}" --project "$PROJECT" || status=$?
  exit "$status"
fi
found=()
for p in .adf modules standards; do [ -e "$p" ] && found+=("$p"); done
for d in .agents/skills .claude/skills .codex/skills .agent/skills .gemini/skills .opencode/skills; do
  if [ -d "$d" ]; then
    for s in "$d"/adf-*; do [ -e "$s" ] && found+=("$s"); done
  fi
done
if [ -f skills-lock.json ] && grep -q 'chungtsai/adf-framework' skills-lock.json; then found+=("skills-lock.json（含 ADF 紀錄）"); fi
for f in CLAUDE.md AGENTS.md; do
  if [ -f "$f" ] && grep -Eq 'framework/(review|templates)' "$f"; then found+=("$f（含舊版 ADF 引用）"); fi
done
if [ ${#found[@]} -gt 0 ]; then
  printf '[ADF] 偵測到既有 ADF 痕跡：\n' >&2
  printf '        - %s\n' "${found[@]}" >&2
  fail "這不是全新專案。請依 $REPO/tree/main/docs/upgrades 的 SOP 移轉，不要用一鍵安裝覆寫。"
fi

# 寫入前確認
say "即將安裝 ADF $VERSION 到 $PROJECT（Agent：$AGENT${COPY:+，copy 模式}）"
say "會新增：Skill 目錄、skills-lock.json、.adf/；不修改其他檔案"
if [ -z "$YES" ]; then
  { : </dev/tty; } 2>/dev/null || fail "無法互動確認（沒有終端機）；確認要執行請加 --yes 或設定 ADF_YES=1"
  printf '[ADF] 確定要繼續嗎？[y/N] ' >/dev/tty
  read -r ans </dev/tty || ans=""
  case "$ans" in y|Y|yes|YES) ;; *) say "已取消，未寫入任何檔案。"; exit 0 ;; esac
fi

# 3. 下載同版本原始檔（專案外暫存），用來比對安裝結果是否完整
WORK="$(mktemp -d "${TMPDIR:-/tmp}/adf-install.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
SRC="${ADF_SOURCE_DIR:-}"
if [ -z "$SRC" ]; then
  command -v curl >/dev/null 2>&1 || fail "找不到 curl"
  command -v tar  >/dev/null 2>&1 || fail "找不到 tar"
  say "下載 $VERSION 原始檔以供比對"
  mkdir -p "$WORK/src"
  curl -fsSL "https://codeload.github.com/chungtsai/adf-framework/tar.gz/refs/tags/$VERSION" \
    | tar -xz -C "$WORK/src" --strip-components=1 || fail "無法下載 $VERSION；請確認版本存在且網路可連到 GitHub"
  SRC="$WORK/src"
fi
[ -d "$SRC/skills/adf-project-install" ] || fail "原始檔不完整：$SRC/skills"

# 4. 專案層級安裝全部 Skill（不加 -g，明確指定 Agent，不用 --all）
say "安裝 ADF $VERSION 到 $PROJECT（Agent：$AGENT）"
# shellcheck disable=SC2086
npx -y skills add "$REPO/tree/$VERSION" --skill '*' -a "$AGENT" -y $COPY </dev/null

# 5. 找到 adf-project-install
TOOL=""
for d in .agents/skills .claude/skills; do
  [ -f "$d/adf-project-install/scripts/project.mjs" ] && { TOOL="$d/adf-project-install/scripts/project.mjs"; break; }
done
if [ -z "$TOOL" ]; then
  # 其他 Agent 可能安裝在其專屬目錄；只接受專案內位置
  TOOL="$(find . -path '*/skills/adf-project-install/scripts/project.mjs' -not -path './node_modules/*' 2>/dev/null | head -n1 || true)"
fi
[ -n "$TOOL" ] || fail "安裝後找不到 adf-project-install；請確認 Agent 名稱是否正確"
INST="$(dirname "$(dirname "$(dirname "$TOOL")")")"

# 6. 逐檔比對：每支 Skill 的 SKILL.md、scripts/、assets/、references/ 都必須在正確位置且內容一致
say "檢查安裝檔案完整性"
missing=0; total=0
while IFS= read -r rel; do
  total=$((total+1))
  if [ ! -f "$INST/$rel" ]; then printf '        缺少：%s/%s\n' "$INST" "$rel" >&2; missing=$((missing+1))
  elif ! cmp -s "$SRC/skills/$rel" "$INST/$rel"; then printf '        內容不同：%s/%s\n' "$INST" "$rel" >&2; missing=$((missing+1)); fi
done < <(cd "$SRC/skills" && find . -type f | sed 's|^\./||' | sort)
[ "$missing" -eq 0 ] || fail "$missing 個檔案缺少或不一致（共 $total 個）。請重新執行；不要手動複製，否則與 skills-lock.json 不符。"
say "檔案完整：$total 個檔案已就位於 $INST/"

# 7. PLAN → APPLY → VERIFY（計畫檔放在專案外）
say "PLAN（唯讀）"
if ! node "$TOOL" PLAN "$PROJECT" > "$WORK/plan.json"; then
  node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));for(const b of p.blockers||[])console.error("        - "+b)' "$WORK/plan.json" || true
  fail "PLAN 有 blockers，未寫入任何 .adf 設定。已安裝的 Skill 保留；處理後可重跑 PLAN/APPLY（見 install-policy.md）。"
fi
say "APPLY"
node "$TOOL" APPLY "$PROJECT" "$WORK/plan.json" >/dev/null
say "VERIFY"
node "$TOOL" VERIFY "$PROJECT" >/dev/null || fail "VERIFY 失敗，安裝不可視為完成"

say "完成：ADF $VERSION 已安裝並通過 VERIFY。"
say "建議 commit：skills-lock.json、$INST/、.adf/"
say "下一步：在 Agent 中呼叫 adf-ask 或 adf-develop（NEW）開始第一個 Module。"
say "可選：安裝起始規範（民國年→西元年、顯示、SQL Injection、資料範圍）：curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/standards.sh | bash"
}

main "$@"
