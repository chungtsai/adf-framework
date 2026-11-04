---
id: DEV-SEC-CONC-001
version: 1.0
status: DRAFT
change_policy: RECOMMENDED
---
# 重複送出與同時修改

## 適用情境
核准、送出、扣款、額度、庫存、序號產生，以及多人可能同時修改同一筆資料的功能。

## 規則
- **DEV-SEC-CONC-001-R1 樂觀鎖**：可被多人修改的資料加上版本欄位（例如 `version`、`updated_at`）；修改時 `WHERE` 帶入讀取時的版本，影響 0 筆即回應「資料已被其他使用者修改，請重新查詢」（依 `DEV-MSG-001`），不得直接覆蓋。
- **DEV-SEC-CONC-001-R2 防止重複送出**：會產生資料或扣款的送出動作使用一次性的送出 Token 或冪等鍵（依 `DEV-SEC-TOKEN-001-R5`），同一 Token 第二次送出時回傳第一次的結果或拒絕；前端送出後停用按鈕只是輔助。
- **DEV-SEC-CONC-001-R3 狀態條件異動**：狀態轉換以條件更新完成，例如 `UPDATE ... SET status='APPROVED' WHERE id=:id AND status='SUBMITTED'`；影響 0 筆表示狀態已變更，不得先查再改而沒有條件。
- **DEV-SEC-CONC-001-R4 額度與序號**：額度扣減、庫存、流水號產生使用資料庫原子操作（條件更新、Sequence、`SELECT ... FOR UPDATE`），不得在程式中讀出、計算、再寫回而沒有鎖定。
- **DEV-SEC-CONC-001-R5 交易邊界**：同一業務動作的多筆異動在同一交易中完成，失敗全部回滾（依 `adf-backend-development` 的交易規則）。

## 移轉專案
Legacy 沒有同時修改保護時，Target 加入樂觀鎖造成的「資料已被修改」提示列為 `APPROVED_BEHAVIOR_CHANGE`；正常單人操作結果與 Legacy 一致。

## 驗證方式
- 兩個視窗開啟同一筆資料，先後儲存：後儲存者收到「資料已被修改」，先儲存的內容不被覆蓋。
- 快速連按送出兩次或重送同一請求：只產生一筆資料或一次扣款。
- 同時核准同一筆資料兩次：只有一次成功。
