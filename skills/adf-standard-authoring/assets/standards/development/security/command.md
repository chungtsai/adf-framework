---
id: DEV-SEC-CMD-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 作業系統指令與動態執行（Command Injection）

## 適用情境
程式會執行作業系統指令（`Runtime.exec`、`ProcessBuilder`、Shell 腳本），或以字串動態執行程式碼（Script Engine、EL、SpEL、OGNL、範本引擎）時適用。

## 規則
- **DEV-SEC-CMD-001-R1 優先使用函式庫**：能以 Java API 或函式庫完成的工作（檔案操作、壓縮、轉檔、寄信）不呼叫作業系統指令。
- **DEV-SEC-CMD-001-R2 不經 Shell**：必須執行指令時，以參數陣列呼叫固定的執行檔（`new ProcessBuilder("convert", in, out)`），不得透過 `sh -c`、`cmd /c` 執行組合字串。
- **DEV-SEC-CMD-001-R3 參數白名單**：傳入指令的參數不得直接來自使用者輸入；必要時以白名單對應（例如格式代碼對應固定參數），檔案路徑依 `DEV-SEC-PATH-001`；拒絕以 `-` 開頭的值，避免被當成選項。
- **DEV-SEC-CMD-001-R4 不動態執行輸入**：不得把使用者輸入當成運算式或程式碼執行（`ScriptEngine.eval`、SpEL／OGNL `parseExpression`、範本引擎的使用者自訂範本）；確有需要時使用沙箱與白名單並經 Human 核准。
- **DEV-SEC-CMD-001-R5 最小權限與逾時**：外部程序以最低權限的帳號執行，設定逾時與輸出大小上限，錯誤輸出不直接回傳前端。

## 範例
```java
// ✗ 禁止
Runtime.getRuntime().exec("sh -c 'convert " + fileName + " out.pdf'");
// ✓ 正確：固定執行檔、參數陣列、檔名由後端產生
new ProcessBuilder("/usr/bin/convert", storedPath.toString(), outPath.toString()).start();
```

## 驗證方式
- 相關輸入測試 `; ls`、`| whoami`、`` `id` ``、`$(id)`、`& dir`、`--help`：不執行額外指令，回應錯誤或正常處理。
- Code Review：搜尋 `Runtime.getRuntime().exec`、`ProcessBuilder`、`ScriptEngine`、`parseExpression`。
