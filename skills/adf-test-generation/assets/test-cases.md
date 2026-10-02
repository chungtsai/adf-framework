# Test Cases

> Test Case 驗證 Requirement / Rule / Functional Scenario。使用者操作型案例應優先連結 `FS-*`。

| ID | Source | Scenario | Preconditions | Test Input | Steps | Expected Result | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| TC-001 | REQ-001 | FS-001 | 使用者已登入 | account=TEST001 | 1. 輸入資料 2. 儲存 | 顯示新增成功 | SELECT 確認 1 筆且欄位值正確 | DRAFT |

## 規則

- `Source` 連結 `REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*` 或 Approved Baseline。
- 使用者操作型測試應填入 `Scenario`，連結至 `FS-*`。
- 測試人員需要輸入資料時，應提供具體 `Test Input`，避免只寫「輸入有效資料」。
- 新增、修改、刪除等資料異動案例，應提供 `Verification SQL / Method` 與明確的 `Expected Data Result`。
- Verification SQL 預設只允許 read-only SELECT。
- Cleanup SQL 與 Verification SQL 必須分開；包含資料異動的 Cleanup 只能由 Human 確認後執行。
- 純 API、Backend、Security 或技術性測試可不填 Scenario，但仍需 Source Traceability。
- Expected Result 不得從目前 Target 實作反推。

