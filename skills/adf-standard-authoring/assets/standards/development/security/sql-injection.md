---
id: DEV-SEC-SQL-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# SQL Injection 防護（禁止串接 SQL）

## 目的
所有資料庫存取都不得因外部輸入改變 SQL 結構。防止 SQL Injection，並讓弱點掃描（例如 Fortify、Checkmarx、SonarQube）沒有相關 Finding。

## 規則
- **DEV-SEC-SQL-001-R1 參數綁定**：所有值一律使用參數綁定：`PreparedStatement` 的 `?`、MyBatis 的 `#{}`、JPA／Hibernate 參數、Named Parameter。
- **DEV-SEC-SQL-001-R2 禁止串接**：不得以字串串接、`String.format`、`StringBuilder` 把使用者輸入或任何外部資料（Request、檔案、其他系統、資料庫讀出的值）組進 SQL，包含 `WHERE`、`IN`、`LIKE`、`ORDER BY`。
- **DEV-SEC-SQL-001-R3 MyBatis `${}`**：禁止使用；唯一例外是經後端白名單對應後的欄位名稱或排序方向，且需在程式中註明對應的白名單。
- **DEV-SEC-SQL-001-R4 動態排序與欄位**：前端傳入的排序欄位與方向，必須對應後端白名單（例如 `Map<String,String>`）；不在白名單內就使用預設排序，不直接帶入 SQL。
- **DEV-SEC-SQL-001-R5 IN 清單**：使用 MyBatis `<foreach>` 或框架提供的集合參數綁定，並限制最大筆數。
- **DEV-SEC-SQL-001-R6 LIKE**：搜尋值用參數綁定，並跳脫 `%`、`_`、`\`，寫成 `LIKE ? ESCAPE '\'`。
- **DEV-SEC-SQL-001-R7 動態條件**：使用 MyBatis `<if>`／`<where>`、Criteria API 或 Query Builder 組條件，不以字串拼接。
- **DEV-SEC-SQL-001-R8 錯誤訊息**：不得把 SQL 或資料庫錯誤內容回傳給前端（配合 `DEV-MSG-001`）。

## 範例
```java
// ✗ 禁止：串接使用者輸入
String sql = "SELECT * FROM account WHERE name = '" + name + "'";

// ✓ 正確：參數綁定
String sql = "SELECT * FROM account WHERE name = ?";
ps.setString(1, name);
```
```xml
<!-- ✗ 禁止 -->
SELECT * FROM account WHERE name LIKE '%${keyword}%' ORDER BY ${sort}
<!-- ✓ 正確：值用 #{}；排序欄位由後端白名單對應後才用 ${} -->
SELECT * FROM account WHERE name LIKE #{keywordEscaped} ESCAPE '\' ORDER BY ${sortColumnFromWhitelist}
```

## 移轉專案
Legacy 以串接方式組 SQL 時，不得照搬到 Target；改為參數綁定，查詢結果仍須與 Legacy 一致。若 Legacy 對 `%`、`_` 等特殊字元的查詢行為因此改變，標 `REVIEW_REQUIRED`，核准後列為 `APPROVED_BEHAVIOR_CHANGE`。

## 驗證方式
- Code Review：搜尋 SQL 字串中的 `+` 串接、`String.format`、MyBatis `${`，逐一確認符合 R3、R4。
- 測試輸入：`' OR '1'='1`、`'; DROP TABLE x; --`、`%`、`_`、`\`；結果只能是正常查詢或查無資料，不可出現 SQL 錯誤或多出資料。
- 弱點掃描沒有 SQL Injection Finding。
