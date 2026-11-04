---
id: DEV-PAGE-001
version: 1.1
status: DRAFT
change_policy: REQUIRED
---
# 分頁查詢與大量資料筆數限制

## 目的
避免一次讀取、回傳或處理過多資料，造成資料庫、應用程式記憶體或瀏覽器負擔過重，甚至被利用來大量撈取資料。

## 規則
- **DEV-PAGE-001-R1 清單一律分頁**：查詢清單使用專案標準的分頁請求與回應（例如 `page`、`size`、`total`），由資料庫分頁（`OFFSET/FETCH`、`ROWNUM`、`LIMIT`），不得先全部讀出再於程式或前端分頁。
- **DEV-PAGE-001-R2 固定排序**：分頁查詢必須有確定的排序，最後一個排序鍵為唯一鍵（例如 PK），避免換頁時資料重複或遺漏。
- **DEV-PAGE-001-R3 每頁上限**：後端限制每頁筆數上限（例如 100）；前端傳入超過上限、0、負數或非數字時，改用上限或預設值，不得依前端值無限制查詢。
- **DEV-PAGE-001-R4 大量處理上限**：匯出、列印、批次異動、`IN` 清單、批次匯入等無法分頁的處理，必須設定最大筆數（例如匯出 10,000 筆）；超過時回應提示（請縮小查詢條件）或改用非同步批次作業，不得直接全部處理。
- **DEV-PAGE-001-R5 先算筆數**：大量處理前先以 `COUNT` 或等效方式確認筆數，超過上限時不執行主要查詢或異動。
- **DEV-PAGE-001-R6 分批處理**：允許的大量處理（批次作業、資料轉檔）以固定批次大小分批讀取與提交（例如每 1,000 筆一次），使用串流或游標，不一次載入記憶體。
- **DEV-PAGE-001-R7 上限可設定**：每頁上限與各功能的最大筆數集中設定（設定檔或共用常數），並寫在設計文件中。

## 範例
```java
int size = (req.size() <= 0 || req.size() > MAX_PAGE_SIZE) ? DEFAULT_PAGE_SIZE : req.size();
long total = mapper.count(cond);
if (exporting && total > MAX_EXPORT_ROWS) throw new BizException("MSG_EXPORT_TOO_MANY", MAX_EXPORT_ROWS);
```

## 移轉專案
Legacy 沒有分頁或筆數限制時，Target 依本規範加上限制，列為 `APPROVED_BEHAVIOR_CHANGE`（需 Human 核准）；每頁預設筆數與排序仍依 `MIG-DISP-001` 與 Legacy 一致。

## 驗證方式
- 傳入 `size=0`、`size=-1`、`size=100000`、`size=abc`：回傳筆數不超過上限，不發生錯誤。
- 換頁測試：連續翻頁的資料不重複、不遺漏。
- 匯出或批次異動資料超過上限：顯示提示，不產生檔案、不異動資料。
- Code Review：沒有不帶分頁或筆數限制的清單查詢。
