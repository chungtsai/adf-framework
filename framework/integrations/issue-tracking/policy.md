# Issue Tracking Policy

## Core Principles

1. ADF Artifact 是 Requirement、Rules、Standards、Design、Verification、Traceability 的 Source of Truth。
2. External Issue 只負責工作登記、Owner、進度與結案狀態。
3. `Finding != Issue`。
4. `UNKNOWN != Issue`。
5. `REVIEW_REQUIRED != Issue`。
6. 建立外部 Issue 前需要 Human 確認 Work Item 要正式進入流程。
7. Issue Tracking 未啟用時，不得改變原 ADF v5 行為。
8. 外部 Issue 不得反向跳過 ADF Review / Verification / Traceability Gate。

## Registration Gate

```text
Candidate Work
  ↓
ADF analysis / classification
  ↓
Human confirms formal work
  ↓
Create external Issue
  ↓
Store tracking reference in manifest
```

## Completion Gate

只有以下條件都通過後才可關閉外部 Issue：

- required verification PASS
- traceability PASS
- no blockers
- Human Final Approval
- ADF Work Item = COMPLETED
