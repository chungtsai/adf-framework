# ADF Skill 操作契約格式

撰寫或修改 ADF Skill 時使用本格式，讓模型不需要猜測輸入、步驟與完成條件。共用規範只引用，不在個別 Skill 內重寫。

## Frontmatter

```yaml
---
name: adf-<skill-name>
description: <做什麼>。<何時使用>。<何時不要用，改用哪支 Skill>。
---
```

description 必須包含三件事：做什麼、何時使用、何時不用。只寫功能名稱會讓相近的 Skill 互相誤觸發。

## 本文章節（依序）

| 章節 | 必填 | 內容 |
|---|---|---|
| `## 目的` | 是 | 一到三句，說明這個 Stage 解決什麼風險。 |
| `## 共用規範` | 是 | 固定引用區塊，見下方。 |
| `## 輸入` | 是 | 需要哪些 Artifact、各自需要的最低狀態（例如 `APPROVED`）；缺少時怎麼處理。 |
| `## 步驟` | 是 | 編號步驟；每步驟寫清楚讀什麼、做什麼、寫到哪裡。 |
| `## 輸出` | 是 | 會建立或修改的檔案、產生的 ID、要更新的 Review 狀態。 |
| `## 完成條件` | 是 | 可檢查的條件清單；任一不成立就不能宣告完成。 |
| `## 禁止事項` | 是 | 本 Stage 特有的禁止行為（共通不變條件已涵蓋的不重寫）。 |
| `## 範例` | 建議 | 一個簡短的輸入→輸出示範。 |
| `## 本 Skill 官方資源` | 有資源時 | 本 Skill 擁有的 resource key 與路徑。 |

尚未改寫成完整契約的 Skill，至少保留 `## 目的` 與 `## 共用規範`。

## 共用規範區塊（固定內容）

```markdown
## 共用規範
執行前透過 `adf-project-install/scripts/project.mjs resolve <project> <resource-key>` 讀取並遵守：
- `core/invariants.md`：共通不變條件。
- `core/runtime-compat.md`：資源解析與舊專案相容性。
- 遇到 `UNKNOWN`、`REVIEW_REQUIRED`、`CONFLICT` 或缺資料時，依 `review/interactive-review.md`、`review/question-schema.md`、`review/approval-gate.md`、`review/terminology.md` 進行 Evidence-Guided Q&A。

來源缺少或版本不相容時停止，不回退全域，不保留本地副本。
```

`scripts/validate.js` 會檢查每支 Skill 都有這個區塊，且沒有重新複製共用規範內容。
