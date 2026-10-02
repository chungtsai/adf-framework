# ADF v5.0 手動導入轉接包

## 目的
將既有手動 v5.0 改由專案層級 npx skills 管理。ADF 功能版本維持 5.0.0；管理方式從 manual 轉為 npx-skills，通過驗證後狀態 verified。不使用「版本 0 → 5」，避免混淆功能版本與管理方式。

這是一次性轉接工具，不依賴 v5.1 或 adf-project-install。不重設完成／核准狀態，不清理 v5.0 範本，不改寫 standards 或 modules。完全未導入 ADF 的專案請使用初始化流程，不能把本工具當成完整首次初始化。

## 前置條件
- Node.js >=22.20.0、npm/npx、Git；工具固定呼叫 skills@1.7.0。
- 可以連線 GitHub 與 npm registry。安裝包是腳本與 SOP，32 支 Skill 由 npx 下載，不是離線 Skill 套件。
- 解壓工具包到目標專案外，計畫 JSON 也保存到專案外。
- 選定原本採用的 v5.0 官方 tag 或 commit。範例使用已確認含 Functional Scenario 與規格書的 v5.0 commit `d2796046d0876297034ddc1610d86258d1b11408`。若原本使用較早的 v5.0，選相對應來源；同一版本字串不保證內容相同。
- 支援 claude-code、codex 的專案層級安裝，不使用 -g。

## 1. 唯讀檢查

```bash
node scripts/migrate-v5-installation.mjs CHECK --project "C:/workspace/my-project" --ref d2796046d0876297034ddc1610d86258d1b11408 --agent claude-code
```

Mac/Linux 改成實際專案絕對路徑。Codex 使用 `--agent codex`。工具會暫存下載所選官方來源，不写入目標專案。

自動盤點 .agents/skills、.claude/skills、.codex/skills；其他手動位置可加 `--legacy legacy/skills`。只接受專案內獨立的 */skills 容器；不允許 standards、modules、framework、.adf、node_modules、.git 作為清理根目錄。

輸出包含檔案新增/替換/移除、原始與目標內容預覽（每檔最多 20,000 字）、雜湊、Git HEAD、未提交狀態及全域同名 Skill。二進位或截斷預覽須另外查看原檔。全域不自動修改；確認 Agent 使用專案來源，避免混用。

## 2. 產生替換計畫

```bash
node scripts/migrate-v5-installation.mjs PLAN --project "C:/workspace/my-project" --ref d2796046d0876297034ddc1610d86258d1b11408 --agent claude-code --output "C:/temp/adf-v5-plan.json"
```

輸出檔必須不存在，避免覆寫先前審查的計畫。檢查：
- source commit 是選定的 v5.0，32 支官方 Skill 完整。
- 差異包含客製 Skill、舊/未知 adf-* Skill、Review 文件以及 AI 指引合併區塊。
- targets 是實際替換與清理清單，不包含 standards、modules、.adf/templates。
- 有 blockers 時先處理，不能 APPLY。

可以一次確認整份計畫；同意就直接以官方版替換，不要求先逐一歸位客製內容。不願取代的內容先保存到非 Skill 的專案規範/指引，或暫停轉接後重新 PLAN。工具不提供「略過卻宣稱完整轉接」模式。

## 3. 確認與執行

```bash
node scripts/migrate-v5-installation.mjs APPLY --project "C:/workspace/my-project" --plan "C:/temp/adf-v5-plan.json"
```

互動模式顯示差異與目標清單，輸入 `REPLACE` 才執行。已透過 AI 或其他介面明確確認這份具體計畫時，可以加 `--confirm`：

```bash
node scripts/migrate-v5-installation.mjs APPLY --project "C:/workspace/my-project" --plan "C:/temp/adf-v5-plan.json" --confirm
```

不能預先替使用者同意未知差異。計畫後有任何被監控檔案或 Git 狀態變更，就重新 PLAN。

執行順序：
1. 從所選 commit 取得官方 v5.0，確認 package version=5.0.0。
2. 在專案外暫存目錄呼叫真正的 `npx skills@1.7.0 add ... --copy`。
3. 驗證32支 Skill內容、GitHub來源、commit、skillPath 與 computedHash。
4. 重新確認專案未變動；保存所有受影響檔案與連結。即使已有 Git，也備份未提交／未追蹤檔案。
5. 將安裝工具產生的內容實體化到專案 .agents/skills，Claude 另放 .claude/skills；合併安裝工具的來源紀錄，保留其他 Skill。
6. 保留 v5.0 的 framework/review 資源；其內容若不同，屬於已列出且經確認的替換項目。
7. 將明確的專案資源指引加入 CLAUDE.md、AGENTS.md 管理區塊，保留區塊外既有內容。
8. 驗證成功後才移除計畫列出的舊副本；不刪除全域 Skill。
9. 保存 `.adf/v5-transfer.json`，記錄 adf_version=5.0.0、management_from=manual、management_to=npx-skills、scope=project、status=verified。

下載或暫存驗證失敗不動專案。套用途中失敗，嘗試還原本工具已寫入的管理檔案；遇到其他程序同時修改就保留備份並要求人工回復，不覆蓋新的使用者修改。

## 4. 驗證

```bash
node scripts/migrate-v5-installation.mjs VERIFY --project "C:/workspace/my-project"
```

確認官方32支 Skill、來源紀錄、Review內容及舊副本清理。套用時會比對 standards、modules、.adf/templates 完全保留；日後正常修改功能文件不算轉接失敗。驗證的是本專案安裝完整性，Agent 的實際載入來源仍要確認，尤其有全域同名 Skill時。

完成後查看專案 Git diff 並提交。重複 APPLY 對同來源／同 Agent 回報 already_transferred，不重新安裝或寫入。

## 5. 回復

```bash
node scripts/migrate-v5-installation.mjs RESTORE --project "C:/workspace/my-project" --backup "APPLY輸出的backup-id"
```

備份位於 `.adf/v5-transfer-backups/<id>`，包含舊 Skill、來源紀錄、Review與指引，以及Git基準。回復只處理本工具的替換目標；如果它們後來有修改則停止，不覆寫。規範、功能文件與範本不在回復寫入範圍。備份保留，不執行 git reset --hard。

也可由 Git 還原已提交檔案，但未提交、未追蹤或被忽略的資料仍需使用備份。prepared/incomplete 記錄只供人工回復；不能把安裝失敗標記為完成。

## 日常更新
之後使用 `npx skills` 管理，不再手動覆寫官方 Skill。但不要直接更新到 main 而意外引入 v5.1；先選目標版本、比較相容性與客製差異。這支轉接工具只驗證 5.0.0，不代替 v5.1 升級 SOP。
