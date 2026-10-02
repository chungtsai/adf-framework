# Approval Gate

## Review State
```yaml
review:
  status: QUESTIONS_PENDING
  questions:
    total: 5
    answered: 4
    unresolved: 1
  blockers:
    - REV-Q-005
  approval:
    required: true
    approved: false
```

允許狀態：`IN_PROGRESS`、`QUESTIONS_PENDING`、`READY_FOR_REVIEW`、`APPROVED`、`CHANGES_REQUESTED`。

## 高價值 Human Gate
Requirement Analysis、Legacy Analysis、Target Analysis、Rules Review、Standards Applicability（有衝突時）、Prototype Review、Development Design、Test Generation（Expected 不確定時）、Result Comparison、Traceability、Retrofit Verification、Baseline Adoption、Development Complete。

Coding 不得每個檔案都詢問完成。`BASELINE_ADOPTION` 必須 Human Approval。

