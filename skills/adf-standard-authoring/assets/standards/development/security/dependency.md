---
id: DEV-SEC-DEP-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 第三方元件與已知弱點

## 目的
避免使用含已知弱點（CVE）的框架、函式庫與前端套件；舊系統常見的 Struts 1／2、log4j 1.x、舊版 commons-collections、jQuery 1.x 等元件不得帶入新系統。

## 規則
- **DEV-SEC-DEP-001-R1 版本受控**：所有相依套件以建置工具（Maven、Gradle、npm）管理並鎖定版本；不得手動放入來源不明的 jar 或 js 檔，必要的例外需記錄來源與版本。
- **DEV-SEC-DEP-001-R2 不得有高風險已知弱點**：上線版本不得含 CVSS 7.0 以上（High／Critical）的已知弱點；無法立即升級時需記錄風險、緩解措施與預計修復日期，並經 Human 核准。
- **DEV-SEC-DEP-001-R3 自動掃描**：CI 加入元件弱點掃描（SCA，例如 OWASP Dependency-Check、`npm audit`、Dependabot、Snyk），掃描結果有 High 以上即失敗或需核准。
- **DEV-SEC-DEP-001-R4 停止支援的元件**：不得選用已停止維護（End of Life）的框架或執行環境版本（例如 Struts 1、Java 8 以前未受支援的版本）。
- **DEV-SEC-DEP-001-R5 最少相依**：只引入功能需要的套件；移除未使用的相依。
- **DEV-SEC-DEP-001-R6 定期更新**：每次版本發布前重新掃描；有重大弱點公告（例如 Log4Shell 等級）時依專案流程緊急修補。

## 移轉專案
Legacy 使用的弱點元件不得直接沿用，依 `MIG-SEC-001` 升級或替換；升級造成的行為差異（例如日期格式、編碼）須以 Regression Test 確認，與 Legacy 不同者依 `adf-result-comparison` 分類。

## 驗證方式
- CI 的 SCA 報告沒有未核准的 High／Critical 弱點。
- 檢查建置產物（WAR、`node_modules`、`WEB-INF/lib`）中沒有未經建置工具管理的 jar 或 js。
