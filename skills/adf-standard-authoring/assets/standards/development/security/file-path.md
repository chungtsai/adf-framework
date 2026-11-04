---
id: DEV-SEC-PATH-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 檔案路徑保護（Path Traversal）

## 目的
功能依使用者輸入讀取、下載、上傳或刪除檔案時，不能因 `../`、絕對路徑或竄改參數而存取允許範圍以外的檔案。

## 規則
- **DEV-SEC-PATH-001-R1 不接受路徑**：前端與 API 不傳遞實體路徑或完整檔名；改傳檔案代碼（例如附件 ID），由後端查表取得實際檔案。
- **DEV-SEC-PATH-001-R2 參數加 Token**：必須由前端傳回的檔案參考（附件 ID、暫存檔代碼）需附上後端簽發的 Token，依 `DEV-SEC-TOKEN-001` 驗證，防止竄改成其他人的檔案。
- **DEV-SEC-PATH-001-R3 限定根目錄**：每種用途設定允許的根目錄（例如上傳區、報表區），集中在設定檔；不得以使用者輸入決定根目錄。
- **DEV-SEC-PATH-001-R4 正規化後檢查**：組出的路徑先正規化（Java：`Path.normalize()` 或 `toRealPath()`），確認仍在允許的根目錄內才存取；不在範圍內一律拒絕，不嘗試修正。
- **DEV-SEC-PATH-001-R5 檔名白名單**：若必須使用檔名，只允許白名單字元與副檔名（例如 `[A-Za-z0-9_\-.]`、`.pdf`、`.xlsx`）；拒絕 `..`、`/`、`\`、`:`、`%2e`、`%2f`、NUL 字元與控制字元；先 URL decode 再檢查。
- **DEV-SEC-PATH-001-R6 上傳另行命名**：上傳檔案以後端產生的名稱（例如 UUID）存放，原始檔名只存在資料庫供顯示；檔案類型、大小與存放位置依 `DEV-SEC-UPLOAD-001`。
- **DEV-SEC-PATH-001-R7 資料範圍**：下載、刪除檔案前同樣檢查功能權限與資料範圍（`DEV-SEC-001`、`DEV-SEC-SCOPE-001`）。
- **DEV-SEC-PATH-001-R8 不洩漏路徑**：錯誤訊息與回應不顯示伺服器實體路徑。

## 範例
```java
// ✗ 禁止：直接使用輸入的檔名
File f = new File(BASE_DIR + request.getParameter("file"));   // file=../../etc/passwd

// ✓ 正確：以附件 ID 查表，正規化後確認仍在根目錄內
Attachment a = attachmentService.findInScope(id, token, user);   // 驗 Token 與資料範圍
Path root = Paths.get(uploadRoot).toRealPath();
Path p = root.resolve(a.storedName()).normalize();
if (!p.startsWith(root)) throw new ForbiddenException();
```

## 驗證方式
- 測試輸入：`../`、`..\`、`%2e%2e%2f`、`....//`、絕對路徑（`/etc/passwd`、`C:\Windows\win.ini`）、含 NUL 的檔名：一律拒絕，且不洩漏路徑。
- 把附件 ID 改成其他人的檔案或竄改 Token：回應「查無資料或無權限存取」。
- 弱點掃描沒有 Path Traversal Finding。
