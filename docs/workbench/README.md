# ADF Skill 情境操作台

依據 ADF v5.1.0 正式 tag 的靜態操作指引；支援情境選擇、QA 檢核、驗證圖解、規則提問、文件搜尋與安裝移轉說明。網站不執行 Skill，也不寫入專案或保存團隊測試結果。

## GitHub Pages 發布

Repository 管理員先至 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。第一次啟用後，到 **Actions → Publish ADF Skill Workbench → Run workflow** 執行發布。

網站來源為 `docs/workbench/`。之後修改此目錄或 `.github/workflows/pages.yml` 並提交到 `main`，會自動發布。發布網址以成功的 workflow deployment 輸出為準。

網頁是純 HTML/CSS/JavaScript，不需要 npm 安裝或建置。`.nojekyll` 避免將內容當成 Jekyll 專案處理。發布 artifact 僅包含操作台目錄，不包含其他 ADF 文件。

## 更新內容

修改 `index.html` 時，對照選定正式 tag 的 README、SKILL.md、resources.json 與升級 SOP；同步版本標示、流程、文件位置及提問模板。UI 檢核不等於 ADF Human Approval。GitHub Pages 內容會公開，請勿加入專案機密或憑證。
