# Human-readable Specification

> 本文件是提供 Human 閱讀的功能規格 Read Model。
> 內容由已核准的 ADF Artifacts 與 Evidence 彙整，不取代 requirements、rules、standards、design、verification 或 traceability，也不得成為獨立的第二套 Source of Truth。

## 1. 功能概要

說明此 Module 的目的、使用者、主要能力與範圍。

## 2. 功能流程

依使用者角度整理主要操作，例如：
- 查詢
- 新增
- 修改
- 刪除
- 其他主要 Business Flow

每個流程以容易閱讀的自然語言說明，不要求 Human 在多份 Artifact 間自行拼接。

## 3. 畫面與輸入

| 欄位 / 操作 | 必填 | 格式 / 限制 | 說明 |
|---|---|---|---|

整理 UI、輸入條件、按鈕及重要顯示規則。

## 4. Business Rules

彙整與本功能直接相關的 `BR-*`、Validation、Permission、狀態限制及重要例外。
保留原始 ID，方便回到正式 Artifact 查證。

## 5. 使用者操作情境

以 `FS-*` 為索引，整理主要 Preconditions、Test Input、User Flow 與 Expected Result。
詳細 Verification SQL / Test Steps 可連結 verification Artifact，不需把所有技術細節重複貼入本文件。

## 6. 資料處理

說明主要資料來源、異動資料、Physical / Soft Delete、重要狀態變化及必要資料關聯。
僅整理已存在 Evidence；不可由 Target 現況自行推定 Business Rule。

## 7. 驗證方式

摘要主要 `TC-*`、Verification Method 與 Expected Result。
詳細測試資料與 SQL 以 `verification/test-cases.md` 為準。

## 8. 例外與限制

整理已知限制、例外流程、UNKNOWN、REVIEW_REQUIRED 與 Human Decision。

## 9. Traceability Summary

列出本規格涵蓋的主要：
- Requirement：`REQ-*`
- Business Rule：`BR-*`
- Functional Scenario：`FS-*`
- Test Case：`TC-*`

完整關係仍以 `verification/traceability.md` 為準。

## 同步規則

- 本文件是 Read Model，不是新的 Evidence Source。
- NEW / CHANGE / MIGRATION 在相關 Human-readable 行為完成核准後，應建立或同步本文件。
- Requirement、Rule、UI、Design、Functional Scenario 等影響 Human 理解的內容變更時，應同步更新。
- 純技術重構且 Human-visible / Business Behavior 未改變時，可不更新內容，但不得留下與正式 Artifact 不一致的描述。
- 若本文件與正式 Artifact 衝突，以已核准的 Source Artifact / Evidence 為準，並將衝突標記 `REVIEW_REQUIRED`。
- 不得直接修改本文件來取代正式 Requirement / Rule / Design / Verification 的變更流程。
