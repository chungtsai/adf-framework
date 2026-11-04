---
id: DEV-SEC-HEADER-001
version: 1.0
status: DRAFT
change_policy: RECOMMENDED
---
# HTTP 安全標頭與伺服器設定

## 適用情境
所有 Web 系統建議採用；對外服務、跨網段服務或有弱點掃描要求的系統必須採用。

## 規則
- **DEV-SEC-HEADER-001-R1 安全標頭**：所有回應加上
  - `Content-Security-Policy`：至少限制 `default-src 'self'`、`frame-ancestors 'self'`，逐步移除 `unsafe-inline`。
  - `X-Content-Type-Options: nosniff`。
  - `X-Frame-Options: SAMEORIGIN`（舊瀏覽器相容）。
  - `Referrer-Policy: strict-origin-when-cross-origin`。
  - HTTPS 站台加上 `Strict-Transport-Security: max-age=31536000`。
- **DEV-SEC-HEADER-001-R2 快取控制**：含個資或登入後內容的回應設 `Cache-Control: no-store`，避免被瀏覽器或代理伺服器快取。
- **DEV-SEC-HEADER-001-R3 隱藏伺服器資訊**：移除或改寫 `Server`、`X-Powered-By` 等版本資訊；錯誤頁使用自訂頁面，不顯示預設錯誤頁與 Stack Trace。
- **DEV-SEC-HEADER-001-R4 關閉不需要的功能**：關閉目錄列表、`TRACE`／`OPTIONS` 等不需要的 HTTP 方法、範例程式與預設管理介面（例如 Tomcat Manager）。
- **DEV-SEC-HEADER-001-R5 CORS**：只允許明確列出的來源；不得 `Access-Control-Allow-Origin: *` 並同時允許帶憑證（配合 `DEV-SEC-CSRF-001`）。
- **DEV-SEC-HEADER-001-R6 集中設定**：標頭在 Web Server、Gateway 或共用 Filter 統一設定，不在各功能中各自設定。

## 驗證方式
- 以瀏覽器開發者工具或 `curl -I` 檢查首頁、登入頁、API 與下載回應都有 R1、R2 的標頭，且沒有伺服器版本資訊。
- 存取不存在的路徑與目錄：顯示自訂錯誤頁，沒有目錄列表。
- 以其他網域的頁面嵌入（iframe）本系統：被瀏覽器阻擋。
