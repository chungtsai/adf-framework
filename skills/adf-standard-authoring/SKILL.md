---
name: adf-standard-authoring
description: 建立或修訂跨 Module 可重用的 Development Standard。
---

# ADF Standard Authoring

## 目的
先搜尋既有 standards/development 避免重複；建立穩定 DEV-*、版本、狀態、change_policy、適用範圍、例外與驗證方式。

## ADF 共通不變條件
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。
- 預設採 Compact Artifacts：`requirements.md`、`rules.md`、`standards.md`、`design.md`、`test-cases.md`、`traceability.md`。
- 檔案存在不代表 Stage 已完成。
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`DEV-*`、`MIG-*`。
- 無法證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`。
- 不得為了取得 `PASS` 而弱化 Expected Result。
- Project-wide Standards 放在 `standards/`。

## Evidence-Guided Q&A
解析單一官方來源 `adf-project-install/references/` 下的 interactive-review、question-schema、approval-gate 與 terminology，依其規則執行。來源缺少或版本不相容時停止需要 Review 的階段，不維護本地副本。

## v5.1 資源與舊專案相容性
- 官方資源唯一位置以 `adf-project-install/references/resources.json` 為準；不複製到專案 `.adf/templates/`，不使用客製範本。
- 從本專案 `.agents/skills/` 或 `.claude/skills/` 解析來源；可使用安裝 Skill 的 `scripts/project.mjs resolve <project> <resource-key>`。兩處版本或內容衝突時停止，不回退到全域。
- 官方資源來源 Skill 未安裝或版本不相容時，提示透過 `npx skills` 在專案層級安裝適用正式版本。Review 不可跳過。
- 先讀取專案 `standards/` 與已核准 Evidence；官方規範範例不是專案核准規範，不自動套用。
- 保留 v5.0 的 Module 文件、完成狀態與核准紀錄；新版缺少欄位或文件列為補做建議，不自動撤銷核准。需要補做另走 CHANGE。
- 在尚未採用新版 Gate 的舊 Module，只列出 Functional Scenario / specification 差異；已明確採用的新工作才檢查新版要求。

## 本 Skill 官方資源
- `standard/development/date-time.md` → `assets/standards/development/date-time.md`。
- `standard/development/error-handling.md` → `assets/standards/development/error-handling.md`。
- `standard/development/frontend/dialog.md` → `assets/standards/development/frontend/dialog.md`。
- `standard/development/frontend/master-detail.md` → `assets/standards/development/frontend/master-detail.md`。
- `standard/development/pagination.md` → `assets/standards/development/pagination.md`。
- `standard/development/security.md` → `assets/standards/development/security.md`。
