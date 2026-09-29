# Rollback

若 5.1 升級驗證失敗：

1. 不得 Merge 更新分支。
2. 回到已保存的 `release/v5.0.0-original` 基準。
3. 保留失敗 Diff 與 Validation Evidence。
4. 修正 Upgrade Package 後重新執行。
5. 不得以重建整套 ADF 取代 Patch / Migration。
