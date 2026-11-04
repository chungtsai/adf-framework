---
id: DEV-SEC-BIND-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 參數綁定白名單（Mass Assignment）

## 目的
防止使用者在請求中多送欄位（例如 `status`、`deptId`、`approver`、`amount`、`role`），因後端自動綁定而修改到不該由使用者決定的資料。

## 規則
- **DEV-SEC-BIND-001-R1 專用 DTO**：每個 API 使用專用的 Request DTO，只宣告該功能允許使用者輸入的欄位；不得把 Request 直接綁定到 Entity 或資料表物件後儲存。
- **DEV-SEC-BIND-001-R2 後端決定的欄位**：主鍵、所屬機關／部門、建立者、建立時間、修改者、狀態、核准者、金額計算結果、權限與角色等欄位，由後端依登入身分與業務規則設定，不接受前端傳入的值。
- **DEV-SEC-BIND-001-R3 逐欄複製**：DTO 轉 Entity 時明確指定要複製的欄位；不使用會複製所有同名欄位的工具（例如 `BeanUtils.copyProperties` 不帶排除清單）把前端資料寫入 Entity。
- **DEV-SEC-BIND-001-R4 修改先讀後改**：修改時先依 PK 與資料範圍（`DEV-SEC-SCOPE-001`）讀出既有資料，只覆寫允許修改的欄位，再儲存；不以前端送來的完整物件覆蓋。
- **DEV-SEC-BIND-001-R5 多送欄位**：DTO 未宣告的欄位忽略或回應錯誤（例如 Jackson `FAIL_ON_UNKNOWN_PROPERTIES`），由專案擇一統一。
- **DEV-SEC-BIND-001-R6 回應也限縮**：API 回應使用 Response DTO，不直接回傳 Entity，避免洩漏密碼雜湊、內部欄位或關聯資料。

## 範例
```java
// ✗ 禁止：前端多送 status=APPROVED、deptId=其他部門就會被存進去
accountRepository.save(request);            // request 是 Account Entity

// ✓ 正確：讀出既有資料，只覆寫允許的欄位
Account a = accountService.findInScope(id, user);
a.setName(req.name()); a.setPhone(req.phone());
a.setUpdatedBy(user.id());
accountRepository.save(a);
```

## 移轉專案
Legacy 以 `request.getParameterMap()` 或 Form Bean 全欄位綁定時，Target 依本規範改為白名單；使用者可正常輸入的欄位與結果須與 Legacy 一致。

## 驗證方式
- 每個新增、修改 API 額外送出 `status`、`deptId`、`createdBy`、`role` 等不允許的欄位：資料庫中這些欄位不被改變。
- API 回應不含密碼雜湊或未在 Response DTO 宣告的欄位。
