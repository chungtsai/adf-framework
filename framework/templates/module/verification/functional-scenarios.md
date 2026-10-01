# Functional Scenarios

> 使用者操作情境用來描述「使用者如何操作、系統如何回應、如何判定成功」。
> 它不是新的 Work Type，也不是獨立於 ADF 的平行流程；它屬於 Verification Artifact。

## Scenario Format

| ID | Source | Preconditions | Test Input | User Flow | UI Expected | Data Verification | Expected Data | Related Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| FS-001 | REQ-001 | 使用者已登入 | account=TEST001 | 1. 開啟功能 2. 輸入資料 3. 儲存 | 顯示新增成功 | SQL / API / Query UI | TEST001 存在且欄位值正確 | TC-001 | DRAFT |

## 規則

- ID 使用 `FS-*`。
- `Source` 必須可追溯到 `REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*` 或已核准 Baseline。
- `Test Input` 應提供測試人員可直接輸入的具體資料，避免要求使用者自行猜測有效測試值。
- `User Flow` 描述使用者可實際執行的操作步驟，不只描述 API 或內部程式流程。
- `UI Expected` 描述操作後畫面應看到的訊息、狀態或資料。
- `Expected Data` 必須來自 Requirement、Rule、Approved Baseline 或其他可驗證 Evidence，不得由 Target 現況反推。
- 一個 Functional Scenario 可以對應一個或多個 Test Case。
- 若 Scenario 只有文件但尚未驗證，Status 不得標記為 VERIFIED。
- 無法確認的操作或結果標記 `REVIEW_REQUIRED`。

## 資料異動驗證

對新增、修改、刪除等資料異動情境，除 UI Expected 外，應優先提供可直接驗證持久化結果的方法，降低測試人員再次回到查詢畫面人工確認的成本。

驗證方式優先順序依專案可用 Evidence 決定：
1. 可安全執行的查詢 SQL。
2. Read-only Query API。
3. Audit / Event / Log Evidence。
4. 既有查詢畫面；僅在沒有更直接驗證方式時使用。

### 建議輸出內容

- `Test Input`：明確列出欄位與建議輸入值。
- `Verification SQL`：以 SELECT 為主，能直接確認本次異動資料。
- `Expected DB Result`：明確描述筆數及重要欄位預期值，不只寫「正確」或「成功」。
- `Cleanup SQL`：需要清除測試資料時可提供，但必須獨立標示，不得混入 Verification SQL。

### 新增範例

```sql
SELECT ACCOUNT, NAME, STATUS
FROM ACCOUNT
WHERE ACCOUNT = 'TEST001';
```

預期：1 筆，ACCOUNT=TEST001、NAME=測試人員、STATUS=Y。

### 刪除範例

```sql
SELECT COUNT(*)
FROM ACCOUNT
WHERE ACCOUNT = 'TEST001';
```

預期：COUNT(*) = 0。

### SQL 安全規則

- Verification SQL 預設只能使用 read-only `SELECT`。
- AI 不得自動執行 `INSERT`、`UPDATE`、`DELETE`、`MERGE`、DDL 或其他資料異動 SQL。
- Cleanup SQL 若包含 DELETE / UPDATE，必須明確標記為人工確認後執行，不得自動執行。
- SQL 必須限制到本 Scenario 的測試資料；若無法建立安全且唯一的條件，標記 `REVIEW_REQUIRED`。
- 不得在 Artifact 寫入正式環境密碼、Token 或其他 Secret。

## CHANGE 補做

既有 Module 已完成開發，但缺少 Functional Scenario 時：

1. 建立新的 `CHANGE` Work Item。
2. Intent 使用 `DOCUMENTATION`；若專案尚未使用此 Intent，可保留 `FEATURE` 並在 title/trigger 明確標記 `RETROFIT_FUNCTIONAL_SCENARIO`。
3. 先讀取目前已核准的 Requirement、Rules、Design、Tests、Traceability 與必要的 Target Evidence。
4. 僅補建 `functional-scenarios.md`、必要的 Test Case 關聯與 Traceability。
5. 若為資料異動功能，同時補建 Test Input、Verification SQL / Verification Method 與 Expected Data。
6. 不得因為補文件而自行修改既有 Business Behavior。
7. 若補 Scenario 時發現規格、測試或實作不一致，標記 `REVIEW_REQUIRED`；確認需要修改行為後，再另開真正的 CHANGE。
