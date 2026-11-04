---
id: DEV-SEC-SECRET-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 機密資訊與設定管理

## 目的
避免資料庫密碼、API Key、加密金鑰、憑證等機密寫在程式或版控中外洩，並限制外洩時的影響範圍。

## 規則
- **DEV-SEC-SECRET-001-R1 不寫在程式與版控**：機密不得寫死在原始碼、設定檔、測試程式、腳本或文件中，也不得 commit 到 repo（包含歷史紀錄）；由環境變數、伺服器設定（JNDI）或金鑰管理服務提供。
- **DEV-SEC-SECRET-001-R2 範本取代實值**：repo 只放設定範本（例如 `application.yml.example`）與佔位值；實際設定檔列入 `.gitignore`。
- **DEV-SEC-SECRET-001-R3 各環境分開**：開發、測試、正式環境使用不同的帳號、密碼與金鑰；正式環境機密只有授權人員可取得。
- **DEV-SEC-SECRET-001-R4 資料庫最小權限**：應用程式使用的資料庫帳號只授予需要的資料表與 `SELECT`／`INSERT`／`UPDATE`／`DELETE` 權限，不得使用 DBA 或可執行 DDL 的帳號。
- **DEV-SEC-SECRET-001-R5 不輸出機密**：日誌、錯誤訊息、健康檢查與管理端點（例如 Spring Boot Actuator `/env`）不得顯示機密；管理端點需權限或關閉。
- **DEV-SEC-SECRET-001-R6 外洩處理**：機密一旦 commit 或外洩，視為已洩漏：立即更換（Rotate），並清除 repo 歷史；只刪除檔案不算處理。
- **DEV-SEC-SECRET-001-R7 加密演算法**：加密使用標準演算法與函式庫（例如 AES-GCM、RSA-OAEP），不自行設計加密；金鑰與加密資料分開存放。

## 移轉專案
Legacy 設定檔中的明文密碼不得搬到 Target，依 `MIG-SEC-001` 改為環境提供，並更換已存在 Legacy 程式碼中的密碼。

## 驗證方式
- 以 Secret Scanning 工具（例如 gitleaks、GitHub Secret Scanning）掃描 repo 與歷史，沒有機密。
- Code Review：搜尋 `password=`、`secret`、`apikey`、`-----BEGIN`、連線字串。
- 確認應用程式資料庫帳號無法執行 `CREATE`、`DROP`、`ALTER`。
