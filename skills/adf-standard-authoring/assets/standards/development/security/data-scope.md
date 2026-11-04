---
id: DEV-SEC-SCOPE-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 資料範圍保護（第一層與第二層一致）

## 用語
- **第一層**：查詢清單、查詢結果列表。
- **第二層**：從第一層進入的明細、編輯、刪除、狀態變更、列印、匯出、附件下載，以及這些功能呼叫的 API。

## 目的
防止使用者直接修改網址或參數中的主鍵（PK、流水號、UUID），讀取或異動不屬於自己資料範圍的資料（IDOR／越權存取）。

## 規則
- **DEV-SEC-SCOPE-001-R1 範圍相同**：第二層必須套用與第一層相同的資料範圍條件，例如所屬機關／部門、承辦人、角色可見範圍、資料狀態可見性。
- **DEV-SEC-SCOPE-001-R2 不得只用 PK**：第二層查詢的 `WHERE` 必須同時包含主鍵與資料範圍條件；不得只用 PK、流水號或 UUID 取得資料。
- **DEV-SEC-SCOPE-001-R3 寫入同樣受限**：修改、刪除、狀態變更的 SQL 也帶入資料範圍條件；影響筆數為 0 時，視為查無資料或無權限，不可改用只有 PK 的 SQL 重試。
- **DEV-SEC-SCOPE-001-R4 由後端決定範圍**：範圍條件由後端依登入身分（Session／Token）計算，不信任前端傳入的部門、角色或範圍參數。
- **DEV-SEC-SCOPE-001-R5 單一實作**：範圍條件集中在共用元件或共用 SQL 片段，第一層與第二層引用同一份，避免兩邊條件不同步。
- **DEV-SEC-SCOPE-001-R6 回應一致**：範圍外的資料與不存在的資料回應相同（例如「查無資料或無權限存取」），不透露資料是否存在。
- **DEV-SEC-SCOPE-001-R7 不靠畫面隱藏**：隱藏按鈕或前端過濾不是保護（配合 `DEV-SEC-001`）。

## 範例
```sql
-- 第一層：清單
SELECT id, name FROM account WHERE dept_id IN (:userDeptIds) AND name LIKE :keyword

-- ✗ 第二層只用 PK：改網址的 id 就能看到其他部門資料
SELECT * FROM account WHERE id = :id

-- ✓ 第二層帶入與第一層相同的範圍條件
SELECT * FROM account WHERE id = :id AND dept_id IN (:userDeptIds)
UPDATE account SET status = 'D' WHERE id = :id AND dept_id IN (:userDeptIds)
```

## 移轉專案
Legacy 第二層若只用 PK 取資料，屬安全缺陷；Target 依本規範修正，列為 `APPROVED_BEHAVIOR_CHANGE`（需 Human 核准），不視為 `MIGRATION_DEFECT`。

## 驗證方式
每個第二層功能（含 API）至少一組權限測試：
1. 使用者 A 開啟自己範圍內的資料：正常顯示或異動。
2. 使用者 A 把網址或參數中的 id 改成範圍外的資料：回應「查無資料或無權限存取」，且資料庫沒有任何異動。
3. 使用不存在的 id：回應與第 2 點相同。
