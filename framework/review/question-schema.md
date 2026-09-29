# Question Schema

機器欄位維持英文，說明與問題文字使用繁體中文。

```yaml
question:
  id: REV-Q-001
  risk: MEDIUM
  status: OPEN
  question: "status D 的業務定義為何？"
  evidence:
    - source: AccountService.java
      note: "D 時禁止修改"
  options:
    - id: A
      text: "停用帳號"
      recommended: true
      reason: "Service 與 Query 都將 D 視為非有效狀態"
    - id: B
      text: "邏輯刪除"
      recommended: false
    - id: C
      text: "鎖定帳號"
      recommended: false
  allow_custom_answer: true
  allow_unknown: true
```

Risk 使用 `HIGH`、`MEDIUM`、`LOW`。候選答案通常 2～3 個，不為湊數而製造沒有 Evidence 的選項。
