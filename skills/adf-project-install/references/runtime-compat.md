# ADF 資源解析與舊專案相容性

所有 ADF Skill 在讀取官方資源或處理既有 Module 時遵守本檔。本檔是唯一來源，各 Skill 只引用不複製。

## 資源解析
- 官方資源唯一位置以 `adf-project-install/references/resources.json` 為準；不複製到專案 `.adf/templates/`，不使用客製範本。
- 從本專案 `.agents/skills/` 或 `.claude/skills/` 解析來源，使用 `node <adf-project-install>/scripts/project.mjs resolve <project> <resource-key>`。
- 兩處版本或內容衝突時停止，不回退到全域 Skill。
- 來源 Skill 未安裝或版本不相容時，提示透過 `npx skills` 在專案層級安裝適用正式版本；需要 Review 的 Stage 不可跳過，直接停止。

## 執行前讀取順序
1. 本 Skill 引用的 `core/*` 與 `review/*` 共用規範。
2. 專案 `standards/` 與已核准 Evidence。
3. 本 Module 的 manifest 與相關 Artifact。

## 舊專案相容性
- 保留既有 Module 文件、完成狀態與核准紀錄；新版缺少的欄位或文件列為補做建議，不自動撤銷核准。需要補做時另走 `CHANGE`。
- 尚未採用新版 Gate 的舊 Module，只列出 Functional Scenario / `specification.md` 差異；已明確採用新版的工作才檢查新版要求。
- 沒有標記版本的 v5.0 文件不是壞檔。
