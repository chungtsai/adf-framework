# Test Cases

> Test Case 驗證 Requirement / Rule / Functional Scenario。使用者操作型案例應優先連結 `FS-*`。

| ID | Source | Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| TC-001 | REQ-001 | FS-001 | 使用者已登入 | 1. 輸入條件 2. 執行查詢 | 顯示符合條件的資料 | DRAFT |

## 規則

- `Source` 連結 `REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*` 或 Approved Baseline。
- 使用者操作型測試應填入 `Scenario`，連結至 `FS-*`。
- 純 API、Backend、Security 或技術性測試可不填 Scenario，但仍需 Source Traceability。
- Expected Result 不得從目前 Target 實作反推。
