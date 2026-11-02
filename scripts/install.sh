#!/usr/bin/env bash
# ADF 全新專案一鍵安裝（macOS / Linux）
#
# 只適用「從未使用過 ADF」的專案：安裝前先檢查，發現任何舊版 ADF 痕跡就停止，
# 改走 docs/upgrades/ 的移轉 SOP。不寫入 standards/、modules/、CLAUDE.md、AGENTS.md。
#
# 用法（在專案根目錄）：
#   curl -fsSL https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.sh | bash
#   或下載整包後執行（見 README「全新專案：一鍵安裝」）
#   bash install.sh [--agent claude-code|codex|...] [--version v5.2.0] [--copy] [--project <dir>]
set -euo pipefail

REPO="https://github.com/chungtsai/adf-framework"
VERSION="${ADF_VERSION:-v5.2.0}"
AGENT="${ADF_AGENT:-claude-code}"
PROJECT="."
COPY=""

say()  { printf '[ADF] %s\n' "$*"; }
fail() { printf '[ADF] 停止：%s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --agent)   AGENT="${2:?--agent 需要值}"; shift 2 ;;
    --version) VERSION="${2:?--version 需要值}"; shift 2 ;;
    --project) PROJECT="${2:?--project 需要值}"; shift 2 ;;
    --copy)    COPY="--copy"; shift ;;
    -h|--help) sed -n '2,10p' "$0" 2>/dev/null || true; exit 0 ;;
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
  fail "此專案已安裝 ADF。驗收請執行 node <skill-root>/scripts/project.mjs VERIFY .；升級請依 docs/upgrades 的 SOP。"
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
npx -y skills add "$REPO/tree/$VERSION" --skill '*' -a "$AGENT" -y $COPY

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
