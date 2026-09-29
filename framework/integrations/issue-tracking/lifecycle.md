# Issue Tracking Lifecycle

ADF canonical workflow:

```text
TODO
  ↓
ANALYSIS
  ↓
REVIEW
  ↓
DEVELOPMENT
  ↓
VERIFICATION
  ↓
COMPLETED
```

外部工具的 Label / State 由 `standards/project/issue-tracking.yaml` 映射。

## Blocked

Blocked 是原因，不取代目前 Stage。

Example:

```text
status::development
blocked::dependency
```

## Drift

ADF Stage 與 External Issue 狀態不一致時，標記：

`ISSUE_TRACKING_DRIFT`

ADF Artifact 仍是流程判定來源。
