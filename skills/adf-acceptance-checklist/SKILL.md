---
name: adf-acceptance-checklist
description: 讀取目前 Work Item 的變更紀錄（work_item.changes）、影響範圍與已核准 Artifact，產生給 Human 逐項操作確認的驗收清單，並在 Human 填寫後回收結果。在 Traceability 完成後、adf-development-complete 結案前使用；只想看進度改用 adf-ask，檢查追溯缺口改用 adf-traceability-check。
---

# ADF Acceptance Checklist

## 目的
把「這次 Work Item 改了什麼、影響哪裡、要怎麼確認」整理成 Human 可以照著操作與簽核的清單，讓驗收只看本次範圍、不漏回歸項目；AI 只產生與回收清單，不代替 Human 判定通過。

## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。

## 輸入

| Artifact | 最低狀態 | 缺少或未達狀態時 |
|---|---|---|
| `manifest.yaml` | 有 Active Work Item | 停止，改用 `adf-feature-init` 或 `adf-ask` |
| `work_item.changes`、`work_item.base_ref` | 有填寫（規則見 `core/invariants.md`「本次變更紀錄」） | 依步驟 2 由版控差異重建範圍，逐項請 Human 確認 |
| `spec/requirements.md`、`spec/rules.md` | 本次相關 ID 為 `APPROVED` | 未核准的 ID 列入「未解決項目」，不產生驗收步驟 |
| `verification/functional-scenarios.md` | 本次相關 `FS-*` 已核准；沒有使用者操作流程時可為 not applicable | 缺少時以 Requirement／Rule 寫驗收項目，並在備註註明「無 FS」 |
| `verification/test-cases.md`、`verification/traceability.md` | Traceability 已完成 | 停止，改用 `adf-traceability-check` |
| `manifest.yaml` 的 `impact`、`behavior.preserve`、`behavior.approved_changes`、`blockers` | — | — |
| `design/design.md` | 有受影響元件時讀取 | — |
| 既有 `verification/acceptance-<work_item.id>.md` | 回收或重新產生時讀取 | — |

## 步驟
1. **判斷模式**：清單不存在 → 產生；清單存在且 Human 已填寫結果或簽核 → 回收（跳到步驟 7）；清單存在但 Artifact 在產生後又有變動 → 重新產生，保留 Human 已填的結果與備註，變動過的項目結果改回 `待驗收`。
2. **確定範圍**：讀取 `work_item.changes`。有 `base_ref` 時，比對 `base_ref` 到目前工作目錄的 Module 文件差異，找出新增、修改、刪除的 ID：
   - 差異中有、`changes` 沒有的 ID：加入範圍並標記 `REVIEW_REQUIRED`，請 Human 確認。
   - `changes` 有、差異中找不到的 ID：列入「未解決項目」，請 Human 確認是否真的有變更。
   - 沒有 `changes`（5.5.0 之前的 Work Item）：只依差異重建範圍；沒有 `base_ref` 也沒有版控時，請 Human 指定本次範圍，不得自行推測。
3. **整理本次說明與影響範圍**：依 Requirement、`behavior.approved_changes` 與 `design.md` 寫出變更目的與新增／修改／刪除清單；依 manifest `impact` 與 `design.md` 列出受影響的畫面、API、資料表或批次，並列出明確未受影響的部分。`impact` 為 `unknown` 時標記 `REVIEW_REQUIRED`。
4. **產生功能驗收項目（AC-001 起）**：範圍內每個使用者可感知的 `FS-*` 一項；沒有 `FS-*` 的 `REQ-*`／`BR-*`／`VAL-*`／`UI-*` 各一項。操作步驟取自 `FS-*`，預期結果取自已核准的 Requirement／Rule；附上對應 `TC-*` 與 Traceability 記錄的目前結果。刪除的行為寫成「確認已不再發生」。
5. **產生回歸項目（AC-101 起）**：`behavior.preserve` 每一項一個；受影響範圍內、本次未修改但共用同一畫面或元件的既有 `FS-*` 各一項。
6. **列出未解決項目並寫檔**：`blockers`、狀態為 `UNKNOWN`／`REVIEW_REQUIRED`／`CONFLICT` 的相關 ID、步驟 2 的差異不一致、對應測試未通過的項目。依 `template/verification/acceptance.md` 寫入 `verification/acceptance-<work_item.id>.md`，manifest `status.verification.acceptance` 設為 `in_review`，回覆中列出驗收項目數與未解決項目。
7. **回收結果**：讀取 Human 填寫的「結果」與「簽核」：
   - 簽核結論為 `通過`，且所有項目為 `通過` 或有理由的 `不適用`、沒有未解決項目 → `status.verification.acceptance: passed`。
   - 結論為 `有條件通過` → 條件與後續 Work Item 寫入 manifest `blockers`（註明來源為驗收清單），狀態維持 `in_review`，由 Human 決定是否以例外核准結案。
   - 任一項 `不通過` 或結論為 `不通過` → `status.verification.acceptance: failed`，每個不通過的 `AC-*` 寫入 `blockers`，並建議回到對應 Stage（行為錯誤 → `adf-verification-fix`；需求或規則要改 → 對應分析 Skill）。
   - 簽核欄空白或結果仍有 `待驗收` → 不改狀態，回報尚未填寫的項目。

## 輸出
- `verification/acceptance-<work_item.id>.md`（每個 Work Item 一份；之前 Work Item 的清單保留不動）。
- `AC-*` 驗收項目 ID（只在本清單內唯一）。
- `manifest.yaml`：`status.verification.acceptance` 為 `in_review`、`passed` 或 `failed`；不通過或有條件通過時寫入 `blockers`。

## 完成條件
- `work_item.changes`（或 Human 確認的重建範圍）內每個 ID 都有對應的 `AC-*`，或列在未解決項目中。
- `behavior.preserve` 每一項都有回歸項目。
- 每個驗收項目都有操作步驟、來自已核准 Artifact 的預期結果，以及對應測試或「無自動化測試」說明。
- 範圍與版控差異不一致的地方都已列出，沒有被默默略過。
- 只有 Human 填寫的簽核結論能讓狀態成為 `passed`。

## 禁止事項
- 不得代 Human 填寫「結果」、「驗收人」或「結論」，也不得依測試結果自動把項目改為 `通過`。
- 不得依程式或畫面現況反推預期結果；Artifact 沒寫的行為標記 `UNKNOWN`。
- 不得為了清單簡潔而省略回歸項目或未解決項目。
- 不得修改 Requirement、Rule、Design、Test 或程式；發現問題時寫入未解決項目或 `blockers`，回到對應 Stage 處理。
- 不得改寫或刪除之前 Work Item 的驗收清單。

## 範例
輸入：`CHG-012`（`CHANGE`／`FEATURE`），`changes.added: [REQ-012, FS-004, TC-031]`、`changes.modified: [BR-003]`，`behavior.preserve: [帳號查詢結果排序不變]`，`impact.ui: true`。

輸出 `verification/acceptance-CHG-012.md`：
- 功能：`AC-001`（FS-004 停用帳號並填原因 → 狀態變為 D，TC-031 PASS）、`AC-002`（BR-003 已停用帳號不可修改 → 顯示 ACCOUNT_DISABLED）。
- 回歸：`AC-101`（帳號查詢結果排序不變，TC-008 PASS）。
- 未解決：版控差異中 `VAL-002` 有修改但未登記在 `changes`（`REVIEW_REQUIRED`）。
- manifest：`status.verification.acceptance: in_review`。

## 本 Skill 官方資源
- `template/verification/acceptance.md` → `assets/acceptance.md`。
