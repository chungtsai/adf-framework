# Traceability

| Source | Rule | Standard | Design | Functional Scenario | Test | Result | Evidence |
|---|---|---|---|---|---|---|---|

## 規則

- 每列只填寫**單一** `Source` 與**單一** `Test`；一個 Requirement 或 Rule 對應多個測試案例時，拆成多列各自記錄 `Result`。沒有測試時 `Test` 填 `不適用`、`Result` 填 `NOT_RUN`。
- `Evidence` 為選填，記錄測試結果出處（如測試報告路徑、ALM Run ID、`comparison.md`）；依既有 Module 拆列轉換時必填。

## Functional Scenario Traceability

- 使用者可操作的主要流程應能由 Source 追到 `FS-*`，再追到 Test 與 Result。
- 純技術驗證不強制建立 Functional Scenario，但仍需保持原有 Source → Test → Result Traceability。
- 既有完成 Module 若透過 CHANGE 補做 Functional Scenario，只新增必要追溯關係，不重寫已核准的歷史證據。
