#!/usr/bin/env bash
# ADF 已安裝專案一鍵更新（macOS / Linux）
#
# 適用：已用 adf-project-install 完成導入（有 .adf/migration.json）的專案。
# 全新專案請用 install.sh；尚未導入 v5.1 的 v5.0 專案請依 docs/upgrades 的 SOP。
# 只更新 Skill 與 skills-lock.json；不碰 standards/、modules/、CLAUDE.md、AGENTS.md、.adf/。
#
# 用法（在專案根目錄）：
#   curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/update.sh | bash
#   bash update.sh [--version v5.4.0|v5.4.0-beta.1] [--agent claude-code|codex|...] [--copy|--no-copy] [--force] [--yes] [--project <dir>]
# 寫入任何檔案前會列出摘要並詢問確認；--yes 或 ADF_YES=1 可略過（CI 使用）。
set -euo pipefail

# 整支包在 main()：curl | bash 時先讀完整支腳本，避免 npx 讀走 stdin 中尚未執行的內容。
main() {

REPO="https://github.com/chungtsai/adf-framework"
VERSION="${ADF_VERSION:-v5.4.1}"
AGENT="${ADF_AGENT:-}"
PROJECT="."
COPY_MODE=""   # 空白＝沿用目前安裝方式；copy / link
FORCE=""
YES="${ADF_YES:-}"

say()  { printf '[ADF] %s\n' "$*"; }
fail() { printf '[ADF] 停止：%s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:?--agent 需要值}"; shift 2 ;;
    --version) VERSION="${2:?--version 需要值}"; shift 2 ;;
    --project) PROJECT="${2:?--project 需要值}"; shift 2 ;;
    --copy)    COPY_MODE="copy"; shift ;;
    --no-copy) COPY_MODE="link"; shift ;;
    --force)   FORCE=1; shift ;;
    -y|--yes)  YES=1; shift ;;
    -h|--help) sed -n '2,12p' "$0" 2>/dev/null || true; exit 0 ;;
    *) fail "未知參數：$1" ;;
  esac
done
case "$VERSION" in v*) ;; *) VERSION="v$VERSION" ;; esac
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-(beta|rc)\.[1-9][0-9]*)?$ ]] || fail "版本格式不正確：${VERSION}（正式版 v5.4.0；測試版 v5.4.0-beta.1 或 v5.4.0-rc.1）"
TARGET="${VERSION#v}"
BASE="${TARGET%%-*}"   # 測試版 v5.4.0-beta.1 的內容版本為 5.4.0

# 1. 前置條件
command -v node >/dev/null 2>&1 || fail "找不到 Node.js；請安裝 Node.js 18 以上版本"
command -v npx  >/dev/null 2>&1 || fail "找不到 npx；請安裝含 npm 的 Node.js"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 版本為 $(node -v)，需要 18 以上"
[ -d "$PROJECT" ] || fail "專案目錄不存在：$PROJECT"
cd "$PROJECT"
PROJECT="$(pwd -P)"
[ "$PROJECT" != "$(cd ~ && pwd -P)" ] || fail "不可直接在 home 目錄執行；請在專案根目錄執行"

# 2. 必須是已完成導入的專案
if [ ! -f .adf/migration.json ]; then
  if [ -e .adf ] || [ -e modules ] || [ -e standards ]; then
    fail "找不到 .adf/migration.json：此專案尚未完成 adf-project-install 導入，請依 $REPO/tree/main/docs/upgrades 的 SOP 移轉。"
  fi
  fail "此專案尚未安裝 ADF。全新專案請改用：curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.sh | bash"
fi
INST=""
for d in .claude/skills .agents/skills; do
  [ -f "$d/adf-project-install/scripts/project.mjs" ] && { INST="$d"; break; }
done
[ -n "$INST" ] || fail "找不到已安裝的 adf-project-install（.claude/skills 或 .agents/skills）；請依 docs/upgrades 的 SOP 處理。"
TOOL="$INST/adf-project-install/scripts/project.mjs"
CURRENT="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version)' "$INST/adf-project-install/references/release.json")"
# 目前安裝的 tag（正式版或測試版）以 skills-lock.json 為準
CURRENT_REF="$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync("skills-lock.json","utf8")).skills["adf-project-install"].ref||"")}catch{console.log("")}')"
[ -n "$CURRENT_REF" ] || CURRENT_REF="v$CURRENT"

# 3. 沿用目前的 Agent 與安裝模式（可用參數覆寫）
if [ -z "$AGENT" ]; then
  if [ -e .claude/skills/adf-project-install ]; then AGENT="claude-code"; else AGENT="codex"; fi
fi
if [ -z "$COPY_MODE" ]; then
  if [ -L "$INST/adf-project-install" ] || { [ "$INST" = ".claude/skills" ] && [ -d .agents/skills/adf-project-install ]; }; then
    COPY_MODE="link"
  elif [ "$INST" = ".claude/skills" ]; then COPY_MODE="copy"; else COPY_MODE="link"; fi
fi
COPY=""; [ "$COPY_MODE" = "copy" ] && COPY="--copy"
say "目前版本：${CURRENT_REF}；目標版本：${VERSION}（Agent：${AGENT}，模式：${COPY_MODE}）"

# 4. 更新前檢查：目前安裝必須通過 VERIFY（含 Skill 未被手動修改），否則更新會覆蓋客製內容
WORK="$(mktemp -d "${TMPDIR:-/tmp}/adf-update.XXXXXX")"
KEEP_WORK=""
cleanup() { [ -n "$KEEP_WORK" ] || rm -rf "$WORK"; }
trap cleanup EXIT
if ! node "$TOOL" VERIFY "$PROJECT" >/dev/null 2>"$WORK/pre.err"; then
  sed 's/^/        /' "$WORK/pre.err" >&2
  [ -n "$FORCE" ] || fail "目前安裝未通過 VERIFY（常見原因：Skill 被手動修改）。請先把客製內容移到 standards/ 或專案外；確認可以覆蓋時加 --force。"
  say "已指定 --force，略過更新前 VERIFY"
fi
if [ "$CURRENT_REF" = "$VERSION" ] && [ -z "$FORCE" ]; then
  say "已是最新：${CURRENT_REF}，且通過 VERIFY；不需要更新。（重新安裝請加 --force）"
  exit 0
fi

# 5. 下載目標版本原始檔（專案外暫存），用來比對安裝結果
SRC="${ADF_SOURCE_DIR:-}"
if [ -z "$SRC" ]; then
  command -v curl >/dev/null 2>&1 || fail "找不到 curl"
  command -v tar  >/dev/null 2>&1 || fail "找不到 tar"
  say "下載 $VERSION 原始檔以供比對"
  mkdir -p "$WORK/src"
  curl -fsSL "https://codeload.github.com/chungtsai/adf-framework/tar.gz/refs/tags/$VERSION" \
    | tar -xz -C "$WORK/src" --strip-components=1 || fail "無法下載 ${VERSION}；請確認版本存在且網路可連到 GitHub"
  SRC="$WORK/src"
fi
[ -d "$SRC/skills/adf-project-install" ] || fail "原始檔不完整：$SRC/skills"
SRC_VERSION="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version)' "$SRC/skills/adf-project-install/references/release.json")"
[ "$SRC_VERSION" = "$BASE" ] || fail "原始檔版本為 ${SRC_VERSION}，與目標 $VERSION 不符"
# 新版必須接受目前 .adf/project.yaml 的格式，否則需要走移轉 SOP
TOOL_VERSION="$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(".adf/project.yaml","utf8")).tool_version||"")}catch{console.log("")}')"
if ! node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.exit((r.compatible_tool_versions||[r.version]).includes(process.argv[2])?0:1)' \
     "$SRC/skills/adf-project-install/references/resources.json" "$TOOL_VERSION"; then
  fail "$VERSION 不接受目前 .adf/project.yaml（tool_version=${TOOL_VERSION:-未知}）；這次升級需要依 $REPO/tree/main/docs/upgrades 的 SOP 進行。"
fi

# 寫入前確認
case "$VERSION" in *-*) say "注意：$VERSION 是測試版，只建議在測試專案或分支使用；正式版發布後請再執行一次更新。" ;; esac
say "即將更新：$CURRENT_REF → ${VERSION}（${PROJECT}）"
say "會改變：$INST/adf-*、skills-lock.json（先備份到專案外，失敗自動還原）；不修改 standards/、modules/、.adf/"
if [ -z "$YES" ]; then
  { : </dev/tty; } 2>/dev/null || fail "無法互動確認（沒有終端機）；確認要執行請加 --yes 或設定 ADF_YES=1"
  printf '[ADF] 確定要繼續嗎？[y/N] ' >/dev/tty
  read -r ans </dev/tty || ans=""
  case "$ans" in y|Y|yes|YES) ;; *) say "已取消，未寫入任何檔案。"; exit 0 ;; esac
fi

# 6. 備份目前的 Skill 與 skills-lock.json（專案外），失敗時自動還原
say "備份目前的 Skill 與 skills-lock.json"
mkdir -p "$WORK/backup"
cp -p skills-lock.json "$WORK/backup/skills-lock.json"
for d in .agents/skills .claude/skills; do
  if [ -d "$d" ]; then
    mkdir -p "$WORK/backup/$d"
    for s in "$d"/adf-*; do [ -e "$s" ] || [ -L "$s" ] || continue; cp -a "$s" "$WORK/backup/$d/"; done
  fi
done
rollback() {
  printf '[ADF] 還原更新前的 Skill 與 skills-lock.json\n' >&2
  local ok=1
  for d in .agents/skills .claude/skills; do
    if [ -d "$d" ]; then for s in "$d"/adf-*; do { [ -e "$s" ] || [ -L "$s" ]; } && rm -rf "$s"; done; fi
    if [ -d "$WORK/backup/$d" ]; then mkdir -p "$d"; cp -a "$WORK/backup/$d/." "$d/" || ok=0; fi
  done
  cp -p "$WORK/backup/skills-lock.json" skills-lock.json || ok=0
  if [ "$ok" = 1 ] && node "$TOOL" VERIFY "$PROJECT" >/dev/null 2>&1; then
    printf '[ADF] 已還原為 %s，並通過 VERIFY。\n' "$CURRENT_REF" >&2
  else
    KEEP_WORK=1
    printf '[ADF] 自動還原未完成；更新前備份保留在：%s/backup\n' "$WORK" >&2
  fi
}
abort() { rollback; fail "$*"; }

# 7. 專案層級重新安裝全部 Skill
say "更新 ADF 到 $VERSION"
# shellcheck disable=SC2086
npx -y skills add "$REPO/tree/$VERSION" --skill '*' -a "$AGENT" -y $COPY </dev/null || abort "npx skills add 失敗"

# 8. 逐檔比對
NEW_INST=""
for d in .claude/skills .agents/skills; do
  [ -f "$d/adf-project-install/scripts/project.mjs" ] && { NEW_INST="$d"; break; }
done
[ -n "$NEW_INST" ] || abort "更新後找不到 adf-project-install"
say "檢查安裝檔案完整性"
missing=0; total=0
while IFS= read -r rel; do
  total=$((total+1))
  if [ ! -f "$NEW_INST/$rel" ]; then printf '        缺少：%s/%s\n' "$NEW_INST" "$rel" >&2; missing=$((missing+1))
  elif ! cmp -s "$SRC/skills/$rel" "$NEW_INST/$rel"; then printf '        內容不同：%s/%s\n' "$NEW_INST" "$rel" >&2; missing=$((missing+1)); fi
done < <(cd "$SRC/skills" && find . -type f | sed 's|^\./||' | sort)
[ "$missing" -eq 0 ] || abort "$missing 個檔案缺少或不一致（共 $total 個）"
TOOL="$NEW_INST/adf-project-install/scripts/project.mjs"

# 9. 以新版工具 VERIFY（含 skills-lock.json 來源、雜湊、舊/未知 Skill、專案設定相容性）
say "VERIFY"
if ! node "$TOOL" VERIFY "$PROJECT" >/dev/null 2>"$WORK/post.err"; then
  sed 's/^/        /' "$WORK/post.err" >&2
  abort "新版 VERIFY 失敗，更新不可視為完成"
fi

say "完成：ADF $CURRENT_REF → ${VERSION}，已通過 VERIFY。專案文件與核准狀態未變動。"
say "版本說明：$REPO/blob/$VERSION/docs/releases/${BASE%.*}.md"
say "建議 commit：skills-lock.json、$NEW_INST/"
}

main "$@"
