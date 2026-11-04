---
id: DEV-SEC-AUTH-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 登入、密碼與 Session 管理

## 目的
防止帳號密碼被暴力破解或外洩，防止 Session 被竊取、固定或在登出後繼續使用。

## 規則
- **DEV-SEC-AUTH-001-R1 密碼雜湊**：密碼只儲存以 bcrypt、PBKDF2、scrypt 或 Argon2（含 Salt）產生的雜湊；禁止明文、可逆加密、MD5、SHA-1 或未加 Salt 的雜湊。
- **DEV-SEC-AUTH-001-R2 傳輸加密**：登入頁與所有需登入的頁面、API 使用 HTTPS；帳密不得放在網址參數。
- **DEV-SEC-AUTH-001-R3 失敗限制**：同一帳號連續登入失敗達專案規定次數（例如 5 次）時鎖定一段時間或加入延遲／驗證碼；失敗訊息不區分「帳號不存在」與「密碼錯誤」。
- **DEV-SEC-AUTH-001-R4 密碼規則**：密碼長度、複雜度、有效期限與不可重複使用的次數由專案定義（依組織資安規範）；首次登入或重設後必須變更密碼。
- **DEV-SEC-AUTH-001-R5 換發 Session**：登入成功、權限提升（例如切換角色）後重新產生 Session ID，防止 Session Fixation；Session ID 不得出現在網址。
- **DEV-SEC-AUTH-001-R6 逾時與登出**：設定閒置逾時（例如 30 分鐘）與絕對逾時；登出時伺服器端 Session 失效並清除 Cookie。使用 JWT 時需有失效機制（短效期加撤銷清單）。
- **DEV-SEC-AUTH-001-R7 Cookie 屬性**：Session Cookie 設 `HttpOnly`、`Secure`、`SameSite=Lax`（或 `Strict`），`Path` 限縮到系統路徑。
- **DEV-SEC-AUTH-001-R8 重設密碼**：重設連結或驗證碼為一次性、短效期、不可預測；回應不透露帳號是否存在。
- **DEV-SEC-AUTH-001-R9 不記錄密碼**：日誌、錯誤訊息、稽核紀錄不得出現密碼、Session ID 或完整 Token（依 `DEV-SEC-AUDIT-001`）。

## 移轉專案
Legacy 以明文或弱雜湊存放密碼時，Target 依本規範修正；既有密碼的轉換方式（例如使用者下次登入時重新雜湊、強制重設）標 `REVIEW_REQUIRED`，由 Human 決定，列為 `APPROVED_BEHAVIOR_CHANGE`。改用單一登入（SSO）時，本規範中由 SSO 負責的部分在設計文件註明。

## 驗證方式
- 資料庫中的密碼欄位為雜湊值；同一密碼的兩個帳號雜湊不同。
- 連續輸入錯誤密碼達上限：帳號鎖定或延遲，訊息不透露帳號是否存在。
- 登入前後 Session ID 不同；登出後以舊 Cookie 呼叫 API 被拒絕；閒置超過逾時時間後需重新登入。
- 瀏覽器開發者工具檢查 Session Cookie 有 `HttpOnly`、`Secure`、`SameSite`。
