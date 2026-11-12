---
name: adf-standard-authoring
description: 建立或修訂跨 Module 可重用的 Development Standard。
---

# ADF Standard Authoring

## 目的
先搜尋既有 standards/development 避免重複；建立穩定 DEV-*、版本、狀態、change_policy、適用範圍、例外與驗證方式。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 本 Skill 官方資源
- `standard/development/date-time.md` → `assets/standards/development/date-time.md`。
- `standard/development/error-handling.md` → `assets/standards/development/error-handling.md`。
- `standard/development/message.md` → `assets/standards/development/message.md`。
- `standard/development/security/sql-injection.md` → `assets/standards/development/security/sql-injection.md`。
- `standard/development/security/data-scope.md` → `assets/standards/development/security/data-scope.md`。
- `standard/development/security/write-condition.md` → `assets/standards/development/security/write-condition.md`。
- `standard/development/security/file-path.md` → `assets/standards/development/security/file-path.md`。
- `standard/development/security/param-token.md` → `assets/standards/development/security/param-token.md`。
- `standard/development/security/xss.md` → `assets/standards/development/security/xss.md`。
- `standard/development/security/csrf.md` → `assets/standards/development/security/csrf.md`。
- `standard/development/security/auth-session.md` → `assets/standards/development/security/auth-session.md`。
- `standard/development/security/mass-assignment.md` → `assets/standards/development/security/mass-assignment.md`。
- `standard/development/security/input-validation.md` → `assets/standards/development/security/input-validation.md`。
- `standard/development/security/personal-data.md` → `assets/standards/development/security/personal-data.md`。
- `standard/development/security/file-upload.md` → `assets/standards/development/security/file-upload.md`。
- `standard/development/security/secrets.md` → `assets/standards/development/security/secrets.md`。
- `standard/development/security/audit-log.md` → `assets/standards/development/security/audit-log.md`。
- `standard/development/security/dependency.md` → `assets/standards/development/security/dependency.md`。
- `standard/development/security/redirect.md` → `assets/standards/development/security/redirect.md`。
- `standard/development/security/xml-deserialization.md` → `assets/standards/development/security/xml-deserialization.md`。
- `standard/development/security/command.md` → `assets/standards/development/security/command.md`。
- `standard/development/security/http-header.md` → `assets/standards/development/security/http-header.md`。
- `standard/development/security/concurrency.md` → `assets/standards/development/security/concurrency.md`。
- `standard/development/security/rate-limit.md` → `assets/standards/development/security/rate-limit.md`。
- `standard/development/frontend/dialog.md` → `assets/standards/development/frontend/dialog.md`。
- `standard/development/frontend/master-detail.md` → `assets/standards/development/frontend/master-detail.md`。
- `standard/development/code-review.md` → `assets/standards/development/code-review.md`。
- `standard/development/pagination.md` → `assets/standards/development/pagination.md`。
- `standard/development/solid.md` → `assets/standards/development/solid.md`。
- `standard/development/security.md` → `assets/standards/development/security.md`。

## 起始規範
專案可用一鍵規範安裝（`scripts/standards.sh`／`standards.ps1`，內部為 `project.mjs STANDARDS`）把上列範例寫入專案 `standards/`：建議項目（`category: recommended`）預設全部安裝、以編號排除；選填項目（`category: optional`）以編號加入。以 `DRAFT` 寫入者，依本 Skill 審查後再改為 `APPROVED`；既有同路徑或同 ID 的規範不會被覆蓋。

## 後續加入官方規範
初次安裝時沒選、或 ADF 更新後才新增的官方範例，由使用者以提示詞要求加入（例如「把 DEV-SEC-XSS-001 加入專案規範」）。
1. 以專案內安裝的 `adf-project-install/scripts/project.mjs STANDARDS <project>` 列出清單，找出要求的項目（可用編號、pack ID 或 `DEV-*`／`MIG-*`），回報其狀態：`available` 可加入、`installed` 已安裝、`conflict` 已有同 ID 或同路徑的專案規範。
2. `conflict` 時不覆蓋；說明既有檔案位置，請 Human 決定是否改為手動合併（合併屬修訂規範，依本 Skill 審查）。
3. 先執行 `project.mjs STANDARDS <project> --select <項目> --dry-run`，列出將寫入的檔案（含共用規範，例如 `DEV-SEC-TOKEN-001`）與狀態（預設 `DRAFT`），經 Human 確認後才執行 `project.mjs STANDARDS <project> <pack-id> --status DRAFT` 寫入。
4. 寫入後提醒：審查 DRAFT 規範，核准後以 `adf-standard-impact-analysis` 檢查既有 Module 的影響。
5. 要求的規範不在目前安裝版本的清單中時，說明需先以一鍵更新取得新版 ADF，不自行從其他來源複製。
