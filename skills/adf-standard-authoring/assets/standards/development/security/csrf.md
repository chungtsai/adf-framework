---
id: DEV-SEC-CSRF-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 跨站請求偽造（CSRF）

## 目的
使用者已登入時，其他網站或惡意連結不能借用使用者的登入狀態送出新增、修改、刪除等異動請求。

## 規則
- **DEV-SEC-CSRF-001-R1 GET 不異動**：GET、HEAD 只能查詢；新增、修改、刪除、狀態變更、寄信、產生檔案等有副作用的動作一律使用 POST、PUT、PATCH、DELETE。
- **DEV-SEC-CSRF-001-R2 驗證 CSRF Token**：所有異動請求必須帶後端產生、與 Session 綁定的 CSRF Token（表單隱藏欄位或 `X-CSRF-Token` 標頭），後端驗證不符即拒絕；使用框架內建機制（例如 Spring Security CSRF），不自行關閉。
- **DEV-SEC-CSRF-001-R3 Cookie SameSite**：Session Cookie 設 `SameSite=Lax` 或 `Strict`（依 `DEV-SEC-AUTH-001`），作為第二道防線，不取代 R2。
- **DEV-SEC-CSRF-001-R4 不接受跨站來源**：異動請求可再檢查 `Origin`／`Referer` 必須是本系統網域；CORS 不得設定 `Access-Control-Allow-Origin: *` 同時允許帶 Cookie。
- **DEV-SEC-CSRF-001-R5 例外需核准**：以 Bearer Token（非 Cookie）驗證的純 API 可不使用 CSRF Token，但需在設計文件說明並經 Human 核准。

## 範例
```html
<!-- ✗ 禁止：GET 刪除，惡意網頁放 <img src="/account/delete?id=1"> 即可觸發 -->
<a href="/account/delete?id=1">刪除</a>
<!-- ✓ 正確：POST 並帶 CSRF Token -->
<form method="post" action="/account/delete"><input type="hidden" name="_csrf" value="${_csrf.token}"><input type="hidden" name="id" value="1"></form>
```

## 移轉專案
Legacy 以 GET 異動或沒有 CSRF 防護屬安全缺陷，依 `MIG-SEC-001` 修正；操作流程與結果仍與 Legacy 一致。

## 驗證方式
- 對每個異動 API：不帶 Token、帶錯誤 Token、帶其他 Session 的 Token：回應 403，資料無異動。
- 以 GET 呼叫異動網址：被拒絕（405 或 403）。
- 從其他網域的測試頁送出表單：被拒絕。
