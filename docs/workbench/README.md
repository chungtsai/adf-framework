# ADF Skill 情境操作台

依據 ADF v5.4.1 正式 tag 的靜態操作指引；支援情境選擇、一鍵安裝與更新步驟、專案規範安裝（建議項目排除、選填項目加入）、日常工作提示詞範例與提示詞產生器、QA 檢核、驗證圖解、規則提問、文件搜尋與移轉說明。網站不執行 Skill，也不寫入專案或保存團隊測試結果。

另有 `flows.html`（情境流程動畫）：以「公司請假系統」為範例案例，依全新功能、修改既有功能、舊功能移轉、已移轉補驗證、已開發完成導入 ADF、BUGFIX／SECURITY_FIX／REFACTOR、規範變更與不知道下一步等情境，以動畫播放 Stage 與 Human Gate；每個 Stage 附產出說明與範例，產生的 Artifact 依 ADF 範本格式顯示簡化內容，可互動核准或退回。由操作台側欄連結，同樣是單檔、不需建置；範例內容皆為示意。

## GitHub Pages 發布

Repository 管理員先至 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。第一次啟用後，到 **Actions → Publish ADF Skill Workbench → Run workflow** 執行發布。

網站來源為 `docs/workbench/`。之後修改此目錄或 `.github/workflows/pages.yml` 並提交到 `main`，會自動發布。發布網址以成功的 workflow deployment 輸出為準。

網頁是純 HTML/CSS/JavaScript，不需要 npm 安裝或建置。`.nojekyll` 避免將內容當成 Jekyll 專案處理。發布 artifact 僅包含操作台目錄，不包含其他 ADF 文件。

## 更新內容

修改 `index.html` 時，對照選定正式 tag 的 README、SKILL.md、resources.json 與升級 SOP；同步版本標示、流程、文件位置及提問模板。UI 檢核不等於 ADF Human Approval。GitHub Pages 內容會公開，請勿加入專案機密或憑證。
