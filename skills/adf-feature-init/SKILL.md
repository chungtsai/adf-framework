---
name: adf-feature-init
description: 初始化或重用 ADF Module 結構與 manifest。
---

# ADF Feature Init

## 目的
建立必要目錄與 manifest；CHANGE 必須重用既有 Module，並分開記錄 module.origin 與目前 work_item.type。

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
遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或必要資料不足時，依 `.adf/framework/review/` 進入互動審查：
1. 一次只問一個需要 Human 判斷的問題。
2. 依 Evidence 提供 2～3 個合理候選答案；若有推薦答案，必須附上推薦理由與 Evidence，不得把推測描述成事實。
3. 永遠允許「其他／自行輸入」與「不確定，保留 REVIEW_REQUIRED」。
4. `HIGH` Risk（Security、Permission、金額、交易、刪除資料、關鍵 Business Rule、Migration Semantic Mismatch）不得批次接受。
5. `LOW` Risk 可提供批次快速確認，但仍需 Human 明確操作。
6. 問題清除後進入 `READY_FOR_REVIEW`；需要 Human Gate 的 Stage 必須詢問「目前沒有其他待確認問題，是否確認此階段完成？」。
7. 只有 Human 確認後才能標記 `APPROVED`。

## Issue Tracking Registration
- 若 `standards/project/issue-tracking.yaml` 啟用，初始化 manifest 時加入 `tracking` 區塊。
- Issue 建立屬於正式 Work Item Registration；必須先有人類確認要正式進入 ADF 工作流程。
- 已存在外部 Issue 時只登記其識別資訊，不得重複建立。
