---
name: adf-standard-impact-analysis
description: 唯讀分析 Standard 新增或升版對各 Module 的影響。
---

# ADF Standard Impact Analysis

## 目的
不得自動修改 Module；依 REQUIRED、RECOMMENDED、NEW_WORK_ONLY 與目前 Stage 回報影響、嚴重度及下一步。

## ADF 共通不變條件
- Work Type 僅使用 `NEW`、`CHANGE`、`MIGRATION`。
- 每個 Module 同一時間只允許一個 Active Work Item；Module 是主要隔離邊界。
- 預設採 Compact Artifacts：`requirements.md`、`rules.md`、`standards.md`、`design.md`、`test-cases.md`、`traceability.md`。
- 檔案存在不代表 Stage 已完成。
- 穩定識別碼維持英文：`REQ-*`、`BR-*`、`VAL-*`、`Q-*`、`UI-*`、`DEV-*`、`MIG-*`。
- 無法證明的行為必須標記 `UNKNOWN` 或 `REVIEW_REQUIRED`。
- 不得為了取得 `PASS` 而弱化 Expected Result。
- Project-wide Standards 放在 `standards/`。

## Change Policy
- 進行中：回到最早受影響 Stage 重新驗證。
- Completed + `REQUIRED`：建議建立 `CHANGE`，trigger=`STANDARD_CHANGE`。
- Completed + `RECOMMENDED`：回報給 Human 決定。
- `NEW_WORK_ONLY`：不得強迫已完成 Module 回補。

## Evidence-Guided Q&A
遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或必要資料不足時，依 `.adf/framework/review/` 進入互動審查：
1. 一次只問一個需要 Human 判斷的問題。
2. 依 Evidence 提供 2～3 個合理候選答案；若有推薦答案，必須附上推薦理由與 Evidence，不得把推測描述成事實。
3. 永遠允許「其他／自行輸入」與「不確定，保留 REVIEW_REQUIRED」。
4. `HIGH` Risk（Security、Permission、金額、交易、刪除資料、關鍵 Business Rule、Migration Semantic Mismatch）不得批次接受。
5. `LOW` Risk 可提供批次快速確認，但仍需 Human 明確操作。
6. 問題清除後進入 `READY_FOR_REVIEW`；需要 Human Gate 的 Stage 必須詢問「目前沒有其他待確認問題，是否確認此階段完成？」。
7. 只有 Human 確認後才能標記 `APPROVED`。

## Standard Impact 與 Issue
- Impact Analysis 本身維持 READ ONLY，不因掃描到受影響 Module 就自動建立 Issue。
- Completed Module 只有在 change_policy 與 Human 決策確認需要修改後，才可建立新的 CHANGE Work Item / Issue。
