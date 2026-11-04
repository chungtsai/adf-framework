---
id: DEV-SEC-WRITE-001
version: 1.0
status: DRAFT
change_policy: REQUIRED
---
# 修改與刪除必須有強制條件

## 目的
防止修改、刪除（含批次）因條件全部選填、條件為空或被略過，而異動整個資料表或超出預期的大量資料。

## 規則
- **DEV-SEC-WRITE-001-R1 至少一個強制條件**：每個 `UPDATE`、`DELETE`（含邏輯刪除、狀態變更、批次異動 API）至少要有一個必填且能精確限定資料的條件，例如 PK、業務唯一鍵、批次編號；不得所有條件都是選填。
- **DEV-SEC-WRITE-001-R2 後端檢查**：強制條件由後端檢查（不信任前端）；缺少、空白、`null`、只有萬用字元（`%`、`_`）或空清單時，回應錯誤，不執行 SQL。
- **DEV-SEC-WRITE-001-R3 不得產生空 WHERE**：使用 MyBatis `<if>`／`<where>` 或 Query Builder 組動態條件時，強制條件不得放在 `<if>` 中；確保不可能產生沒有 `WHERE` 或只有範圍條件的異動 SQL。禁止 `WHERE 1=1` 後只接選填條件的異動寫法。
- **DEV-SEC-WRITE-001-R4 不以 LIKE 異動**：異動條件不使用 `LIKE` 模糊比對；需要依查詢結果批次異動時，先查出 ID，再以 ID 清單異動（ID 清單依 `DEV-PAGE-001` 限制筆數，可配合 `DEV-SEC-TOKEN-001` 由前一步的 Token 取得）。
- **DEV-SEC-WRITE-001-R5 影響筆數檢查**：執行後確認影響筆數；單筆異動應為 1 筆，批次異動不得超過預期筆數或上限；不符時回滾交易並回應錯誤。
- **DEV-SEC-WRITE-001-R6 資料範圍**：強制條件之外，仍須帶入資料範圍條件（`DEV-SEC-SCOPE-001-R3`）。

## 範例
```xml
<!-- ✗ 禁止：條件全部選填，參數都沒傳時會刪除整張表 -->
DELETE FROM account
<where>
  <if test="deptId != null">dept_id = #{deptId}</if>
  <if test="status != null">AND status = #{status}</if>
</where>

<!-- ✓ 正確：PK 為強制條件，並帶入資料範圍 -->
DELETE FROM account WHERE id = #{id} AND dept_id IN <foreach collection="userDeptIds" item="d" open="(" separator="," close=")">#{d}</foreach>
```

## 驗證方式
- 呼叫修改、刪除 API 時不傳任何條件、傳空字串、`null`、`%`、空清單：回應錯誤，資料庫沒有任何異動。
- 單筆異動影響筆數不是 1、批次異動超過上限：交易回滾。
- Code Review：搜尋所有 `UPDATE`、`DELETE`，確認強制條件不在 `<if>` 中。
