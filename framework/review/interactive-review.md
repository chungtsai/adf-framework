# Interactive Review / Evidence-Guided Q&A

## 目的
當 ADF 遇到無法由 Evidence 證明的事項時，不自行猜測，也不只停在 `BLOCKED`，而是用低互動成本的一問一答完成 Human-in-the-loop Review。

## 觸發條件
- `UNKNOWN`
- `REVIEW_REQUIRED`
- `CONFLICT`
- 必要資料缺失
- 高風險 Semantic Mismatch

## 流程
`IN_PROGRESS` → `QUESTIONS_PENDING` → `READY_FOR_REVIEW` → `APPROVED`。若 Human 要求修改：`READY_FOR_REVIEW` → `CHANGES_REQUESTED` → `IN_PROGRESS`。

一次只問一題。先顯示 Evidence，再提供 2～3 個合理候選答案；推薦答案必須說明理由。提供自訂回答與保留 `REVIEW_REQUIRED` 的選項。回答後更新對應 Artifact 並重新檢查。

`HIGH` Risk 不得批次接受；`LOW` Risk 可提供批次快速確認。所有問題清除後，如該 Stage 需要 Human Gate，詢問：「目前沒有其他待確認問題，是否確認此階段完成？」未明確確認不得標記 `APPROVED`。
