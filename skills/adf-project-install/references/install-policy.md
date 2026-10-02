# v5.1 專案移轉政策

## 狀態
CHECK / PLAN 唯讀；APPLY 只執行計畫；VERIFY 驗證後才完成。RESTORE 回復專案移轉，Skill 與安裝紀錄另外還原。

## 單一官方來源
resources.json 指定各資源的唯一 owner。先解析本專案 .agents/skills/<owner>，再確認 .claude/skills/<owner> 若存在是同一來源或相同內容。允許 Agent 符號連結指向本專案 .agents/skills，但禁止指向全域或專案外。不同內容、未知版本、缺少 release.json 或缺少資源都阻擋使用；不得自行複製替代品。

## 相容性
工具版本為 5.1.0，支持專案文件格式 5.0、5.1。舊專案沒有設定時記錄 document_schema=5.0、adopted_base=unknown，不因安裝工具而宣稱既有內容已升級。新專案記錄 5.1，但官方規範預設仍未採用。已完成舊 Module 不重設核准；補做另走 CHANGE。

## 客製內容
PLAN 會攔截未知 .adf/templates 檔案。歸位時由人確認必要內容，將業務規則保存到 standards 或 modules 需求文件。以專案外 JSON resolution 檔記錄 entries: [{source, source_hash, destination, destination_hash, human_confirmed:true}]，source 相對 .adf/templates，destination 只限 standards/ 或 modules/，雜湊為 SHA-256。執行 PLAN <project> <resolution.json>。此紀錄證明人確認的歸位，工具不假裝自動理解語意；原檔仍備份保留。

## 寫入保護
既有 project.yaml 必須是本工具的 JSON-compatible YAML（JSON 是 YAML 子集）；其他 YAML 保留並列為需人工合併，不能直接替換。計畫、resolution 與回復紀錄只接受受限結構，不接受任意寫入路徑。APPLY 前再比對 snapshot；拒絕舊計畫。讀取受保護資料與寫入 .adf 區域遇到符號連結停止。刪除僅限已備份的 .adf/templates；不刪除 framework、全域 Skill、source code 或功能文件。

## 備份
APPLY 備份舊範本與舊 project.yaml，記錄移轉前後受保護檔案的雜湊。VERIFY 確認一致後標示完成；失敗保留備份。RESTORE 若專案移轉後有新修改則拒絕還原；回復不重新覆寫 standards/modules。安裝 npx 之前的 Skill 備份是另一階段，必須在開始前完成。

## 全域同名 Skill
盤點全域 Skill 只讀，不刪除其他專案的全域資源。若存在，確認本次 Agent 僅使用專案來源，保存 Agent 設定或載入結果等證據。在 resolution JSON 中加入 global_dispositions: [{path: "盤點輸出的全域路徑", disposition: "project_scope_only", human_confirmed: true, evidence: "設定/載入證據說明"}]。沒有明確證據則阻擋完成，不能僅因 project 路徑存在就假設 Agent 不會混用。

## 安裝來源
檢查專案 skills-lock.json 的 version=1、GitHub source、ref=v5.1.0、skillPath 與 computedHash；沒有安裝工具來源紀錄的手動副本不能宣稱已轉接完成。未知 lockfile 格式保留並阻擋，不由 ADF 偽造或改寫。v5.1.0 tag 尚未發佈前，分支只供開發驗證，不能標示正式移轉完成。
