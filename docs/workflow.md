# Workflow

NEW / CHANGE / MIGRATION converge on rules → standards → optional prototype → design → implementation → tests → traceability → acceptance checklist (human sign-off) → completion.

Every Work Item records `work_item.base_ref` and `work_item.changes`; `adf-acceptance-checklist` uses them to list only this Work Item's changes, impact and regression checks for human acceptance.


## Existing-system adoption

### Retrofit verification (Legacy available)
Legacy analysis + target analysis -> comparable tests -> dual execution -> normalization -> semantic comparison -> traceability. Verify first; findings become separate CHANGE work after review.

### Baseline adoption (no Legacy)
Target analysis -> reverse candidate rules -> standards applicability -> human review -> approved current baseline -> regression tests -> traceability. This establishes future-change confidence; it does not claim historical migration correctness.

