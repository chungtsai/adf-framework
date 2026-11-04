---
id: DEV-SEC-XSS-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 輸出編碼（XSS）

## 目的
使用者輸入、資料庫或其他系統的資料顯示到畫面時，不能被瀏覽器當成 HTML 或 JavaScript 執行。防止 Cross-Site Scripting（反射型、儲存型、DOM 型）。

## 規則
- **DEV-SEC-XSS-001-R1 輸出一律編碼**：所有動態資料輸出前依情境編碼；JSP 使用 `<c:out>` 或 `fn:escapeXml`，不得直接輸出 `${param.x}`、`<%= %>`、`out.print(變數)`。
- **DEV-SEC-XSS-001-R2 依情境編碼**：HTML 內容、HTML 屬性、JavaScript 字串、URL 參數、CSS 使用各自的編碼（例如 OWASP Java Encoder 的 `forHtml`、`forHtmlAttribute`、`forJavaScript`、`forUriComponent`）；HTML 編碼不能用在 JavaScript 情境。
- **DEV-SEC-XSS-001-R3 前端框架**：使用框架預設的跳脫輸出（Vue `{{ }}`、React JSX）；禁止把未清理的資料放進 `v-html`、`dangerouslySetInnerHTML`、`innerHTML`、`document.write`、`eval`、`setTimeout(字串)`。
- **DEV-SEC-XSS-001-R4 富文字白名單**：確實需要使用者輸入 HTML 時，後端以白名單清理（例如 OWASP Java HTML Sanitizer、jsoup Safelist），只保留允許的標籤與屬性，移除 `script`、事件屬性（`on*`）與 `javascript:` 網址。
- **DEV-SEC-XSS-001-R5 JSON 與 Content-Type**：API 回應設定正確的 `Content-Type`（`application/json`），不把 JSON 組進 HTML 的 `<script>` 區塊；必須內嵌時以安全的序列化並跳脫 `<`、`>`、`&`。
- **DEV-SEC-XSS-001-R6 不以輸入過濾取代**：後端可拒絕不合理的輸入（依 `DEV-SEC-INPUT-001`），但不能用「過濾 `<script>` 字串」取代輸出編碼。
- **DEV-SEC-XSS-001-R7 Cookie 與 CSP**：Session Cookie 設 `HttpOnly`（依 `DEV-SEC-AUTH-001`）；可行時加上 `Content-Security-Policy`（依 `DEV-SEC-HEADER-001`），作為第二道防線。

## 範例
```jsp
<%-- ✗ 禁止 --%>
<input value="${param.keyword}">  <script>var name = '${user.name}';</script>
<%-- ✓ 正確 --%>
<input value="<c:out value='${param.keyword}'/>">
<script>var name = '<%= Encode.forJavaScript(user.getName()) %>';</script>
```

## 移轉專案
Legacy 直接輸出未編碼資料屬安全缺陷，依 `MIG-SEC-001` 修正。編碼後畫面顯示的文字仍須與 Legacy 一致（依 `MIG-DISP-001`）；Legacy 若依賴輸出 HTML 標記（例如資料庫存放 `<br>`），標 `REVIEW_REQUIRED`，由 Human 決定改用白名單清理或改資料格式。

## 驗證方式
- 每個輸入欄位與網址參數測試：`<script>alert(1)</script>`、`"><img src=x onerror=alert(1)>`、`';alert(1);//`、`javascript:alert(1)`；儲存後在清單、明細、匯出、列印畫面都只顯示文字，不執行。
- Code Review：搜尋 `<%=`、未包在 `<c:out>` 的 `${`、`innerHTML`、`v-html`、`dangerouslySetInnerHTML`、`eval`。
- 弱點掃描沒有 XSS Finding。
