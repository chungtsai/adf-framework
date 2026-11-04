---
id: DEV-SEC-UPLOAD-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 檔案上傳與匯出

## 目的
防止上傳可執行或惡意檔案、以超大檔案耗盡資源，以及匯出的 Excel／CSV 在開啟時執行公式（CSV Injection）。

## 規則
### 上傳
- **DEV-SEC-UPLOAD-001-R1 類型白名單**：只允許功能需要的副檔名（例如 `.pdf`、`.jpg`、`.png`、`.xlsx`），並以檔案內容（magic bytes）確認實際類型；不只相信副檔名與 `Content-Type`。
- **DEV-SEC-UPLOAD-001-R2 大小與數量**：限制單檔大小、總大小與檔案數量（伺服器與應用程式兩層都設定）；超過時拒絕。
- **DEV-SEC-UPLOAD-001-R3 存放位置**：存放在網站根目錄以外、無執行權限的目錄或物件儲存；以後端產生的名稱（例如 UUID）存放，原始檔名只存資料庫供顯示（依 `DEV-SEC-PATH-001`）。
- **DEV-SEC-UPLOAD-001-R4 壓縮檔與文件**：解壓縮時限制解壓後總大小與檔案數（防 Zip Bomb），並檢查每個檔名（防 Zip Slip）；解析 Office 或 XML 文件依 `DEV-SEC-XML-001`。
- **DEV-SEC-UPLOAD-001-R5 掃毒**：環境有防毒或檔案檢查服務時，上傳後先掃描，通過才可供下載或處理。
### 下載與匯出
- **DEV-SEC-UPLOAD-001-R6 下載標頭**：下載設 `Content-Disposition: attachment`、正確的 `Content-Type` 與 `X-Content-Type-Options: nosniff`；使用者上傳的 HTML、SVG 不在本系統網域內直接開啟。
- **DEV-SEC-UPLOAD-001-R7 公式注入**：匯出 Excel／CSV 時，儲存格文字以 `=`、`+`、`-`、`@`、Tab、CR 開頭者前面加上單引號 `'`（或設為文字格式），避免被當成公式執行；數值欄位以數值型別輸出不受影響。
- **DEV-SEC-UPLOAD-001-R8 權限與筆數**：下載與匯出檢查功能權限與資料範圍（`DEV-SEC-001`、`DEV-SEC-SCOPE-001`），匯出筆數依 `DEV-PAGE-001`，個資依 `DEV-SEC-PII-001` 遮罩。

## 驗證方式
- 上傳 `.jsp`、`.exe`、把 `.exe` 改名為 `.pdf`、超過大小上限的檔案：一律拒絕。
- 上傳後確認伺服器存放名稱不是原始檔名，且位置無法以網址直接存取。
- 資料內容為 `=1+1`、`=HYPERLINK("http://example.com")`、`@SUM(A1)` 時，匯出檔案開啟後顯示原文字，不計算。
