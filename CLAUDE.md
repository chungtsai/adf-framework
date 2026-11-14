# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 這個 repository 是什麼

ADF（AI Development Framework）是一組 34 支專案層級 Skill（`skills/adf-*/SKILL.md`），使用者以 `npx skills add https://github.com/chungtsai/adf-framework/tree/<tag>` 從**正式 tag** 安裝到自己的專案（`.claude/skills/` 或 `.agents/skills/`）。本 repo 沒有可建置的應用程式；主要產物是 Skill 文字、共用規範、安裝／更新腳本與操作台網站。

語言政策：人看的內容用繁體中文；Skill ID、檔名、YAML/JSON key、`NEW/CHANGE/MIGRATION`、Intent、Status、`REQ-*`／`BR-*`／`FS-*`／`TC-*`／`AC-*`／`DEV-*`／`MIG-*` 等識別碼與程式碼維持英文。

## 指令

```bash
npm run validate          # = node scripts/validate.js，結構與單一來源檢查（CI 必跑）
npm test                  # = node --test tests/*.test.mjs（CI 必跑）
node --test tests/update.test.mjs                          # 單一測試檔
node --test --test-name-pattern="rolls back" tests/update.test.mjs   # 單一測試案例
```

不需要 `npm install`（無相依套件，Node >= 18，ESM）。`install`／`update` 測試以假的 `npx` stub 離線執行，需要 bash；Windows 上會 skip。`.ps1` 只有靜態檢查（不得在 native 指令參數中夾帶雙引號，Windows PowerShell 5.1 會剝掉）。

## 架構重點

### 單一來源（Single Source）
- `skills/adf-project-install/references/resources.json` 是所有官方資源的登錄表：resource key（`core/*`、`review/*`、`template/*`、`standard/*`）→ 唯一 owner Skill 與路徑。範本放在 owner Skill 的 `assets/`，共用規範放在 `adf-project-install/references/`。
- 共用規範只寫在 `core-invariants.md`（`core/invariants.md`）與 `runtime-compat.md`（`core/runtime-compat.md`）。其他 Skill **不可複製**，只能保留 `core/skill-contract.md` 裡定義的固定 `## 共用規範` 區塊（逐字一致）。
- `scripts/validate.js` 強制：剛好 34 支且與 `references/skills.json` 一致、frontmatter 的 `name` 等於目錄名、每支 `references/release.json` 版本等於 `resources.json.version`、共用區塊逐字一致、不得重新出現已退役章節（「ADF 共通不變條件」等）、同一行（≥20 字）出現在 3 支以上 Skill 即失敗（應移到 `core/invariants.md`）、SKILL.md 引用的 resource key 必須存在、每個資源只有一個 owner。
- 新寫或改寫 Skill 依 `core/skill-contract.md` 的操作契約格式（目的、共用規範、輸入、步驟、輸出、完成條件、禁止事項、範例）；`adf-backend-development` 是完整範例。

### 安裝與移轉工具
- `skills/adf-project-install/scripts/project.mjs`：`CHECK` / `PLAN` / `APPLY` / `VERIFY` / `RESTORE` / `resolve`。它在**使用者專案**中執行，從專案的 Skill 目錄解析資源（不回退全域、拒絕 symlink 逃逸），並要求 `skills-lock.json` 每支 Skill 的 `ref` 等於 `v<resources.json.version>` 或同版號測試版 `-beta.N`／`-rc.N`（34 支一致）。`.adf/project.yaml` 的 `tool_version` 必須在 `resources.json.compatible_tool_versions` 內。由 `tests/migration.test.mjs` 涵蓋。
- `scripts/install.sh` / `install.ps1`：全新專案一鍵安裝（npx → 逐檔比對 → PLAN → APPLY → VERIFY）；偵測到已安裝（`.adf/migration.json`）時轉交 `update.*`，有舊版痕跡則在寫入前停止。
- `scripts/update.sh` / `update.ps1`：一鍵更新（更新前 VERIFY → 相容性檢查 → 專案外備份 → npx 重裝 → 逐檔比對 → VERIFY，失敗自動還原）。
- `--version`／`-Version` 只接受 `vX.Y.Z`、`vX.Y.Z-beta.N`、`vX.Y.Z-rc.N`；測試版與正式版內容版本相同，`project.mjs` 的 `isSupportedRef` 接受同版號的測試版 `ref`（34 支必須一致），`update.*` 以 `skills-lock.json` 的 `ref` 判斷「已是最新」。發布流程：分支升版 → 打 `-beta.N` 驗收 → 合併 `main` → 打正式 tag（`docs/distribution.md`「測試版與正式發布」）。
- 兩組腳本寫入前都要詢問 `[y/N]`，`--yes` / `-Yes` / `ADF_YES=1` 略過。sh 與 ps1 必須保持行為一致。
- `scripts/standards.sh` / `standards.ps1`：起始規範一鍵勾選安裝。下載 `ADF_REF`（預設 main）的原始檔，執行其中的 `project.mjs STANDARDS <project> [ids] --status DRAFT|APPROVED`，把 `references/standard-packs.json` 選定 pack 的 `standard/*` 資源寫入專案 `standards/`（只新增、同路徑或同 ID 略過）。`STANDARDS` 從工具自己的 Skill 樹讀規範（repo 與安裝後目錄結構相同），不經過專案的 `resolve`；需專案已有 `.adf/migration.json`。pack 有 `category`：`recommended`（預設安裝，以 `--exclude` 排除）或 `optional`（以 `--add` 加入），建議項目必須排在選填項目前面（編號即清單順序，validate 會檢查）；選擇邏輯集中在 `project.mjs` 的 `standardsSelect`（`--recommended`／`--exclude`／`--add`／`--select`，`--dry-run` 只預覽），sh 與 ps1 不自行解析編號。新增 pack 時，規範檔需有 frontmatter `id` 與 `status: DRAFT`（validate 會檢查），並同步網站「專案規範安裝」與 README 表格。由 `tests/standards.test.mjs` 涵蓋。
- `scripts/init.js`、`doctor.js` 僅為唯讀相容入口，不是安裝器。

### 版本號出現的位置（升版時全部要改）
`package.json`、`resources.json`（`version`，必要時 `compatible_tool_versions`）、34 支 `skills/*/references/release.json`、四支安裝／更新腳本的預設 `v<版本>`、README、`docs/releases/<版本>.md`、`docs/upgrades/` SOP，以及操作台網站。

## 異動需同步更新網站

`docs/workbench/index.html` 是公開的 GitHub Pages 操作台（純 HTML/CSS/JS 單檔，無建置；推到 `main` 且路徑在 `docs/workbench/**` 時由 `.github/workflows/pages.yml` 自動發布）。網站內容是手寫的資料，不會自動跟著 repo 變，**任何影響使用者的異動都必須在同一個變更中同步更新網站**，包括：

- 版本號或正式 tag（頁首、`<meta description>`、頁尾來源連結、規則提問範本、`skills-lock.json` ref 說明、「vX 改了什麼」區塊）。
- 安裝／更新指令、腳本參數、提示訊息或流程步驟（「一鍵安裝與更新」的 `installModes`、「常見狀況」、「手動安裝（進階）」指令）。
- 起始規範 pack 或規範內容（「專案規範安裝」的 `standardPacks`）。
- Skill 新增、改名、職責或流程變動（`scenarios`、`verificationGuides`、`prompts` 提示詞範例、`pbTypes` 提示詞產生器）。
- Work Type、Intent、Status、差異分類、ID 前綴等術語（`terms`、`checkpoints`、「容易混淆的用途」）。
- Module 文件、資源路徑或 `resources.json` 變動（`files` 檔案說明）。

更新網站後一併檢查 `docs/workbench/README.md` 的版本描述；若 `docs/releases/<版本>.md` 記載「網站待更新」，同步移除。網站會公開，不可放入專案機密。修改後用 Playwright 在桌面與手機寬度（約 390px）開啟頁面，確認沒有 console error 與橫向捲動，並點過各個 view。
