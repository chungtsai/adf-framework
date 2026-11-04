---
id: DEV-SEC-REDIRECT-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 導向網址與伺服器端請求（Open Redirect、SSRF）

## 適用情境
功能有 `returnUrl`、`redirect`、`next` 等導向參數，或後端會依使用者輸入的網址去呼叫其他服務（下載圖片、Webhook、預覽連結）時適用。

## 規則
- **DEV-SEC-REDIRECT-001-R1 導向白名單**：登入後導向、操作完成返回等導向目標只接受本系統的相對路徑，或後端白名單中的網域；不符時導向首頁。拒絕 `//evil.com`、`https://evil.com`、`/\evil.com`、`javascript:` 等形式。
- **DEV-SEC-REDIRECT-001-R2 以代碼取代網址**：可行時以頁面代碼（例如 `returnTo=ACCOUNT_LIST`）取代完整網址，由後端對應實際路徑。
- **DEV-SEC-REDIRECT-001-R3 後端請求白名單**：後端依輸入呼叫外部網址時，只允許白名單中的網域與協定（`https`）；解析 DNS 後拒絕內部位址（`127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16`、`::1`）。
- **DEV-SEC-REDIRECT-001-R4 不跟隨轉址**：後端請求不自動跟隨轉址，或每次轉址都重新套用 R3 檢查；設定連線與讀取逾時與回應大小上限。
- **DEV-SEC-REDIRECT-001-R5 不回傳內部錯誤**：外部請求失敗時回應統一錯誤，不回傳對方的回應內容或內部網路資訊。

## 驗證方式
- `returnUrl` 帶入 `https://evil.com`、`//evil.com`、`/\evil.com`、`javascript:alert(1)`：都導向首頁。
- 後端請求功能帶入 `http://127.0.0.1:8080/`、`http://169.254.169.254/`、內部主機名稱：被拒絕。
