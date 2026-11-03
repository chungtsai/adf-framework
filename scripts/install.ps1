# ADF 全新專案一鍵安裝（Windows PowerShell）
#
# 只適用「從未使用過 ADF」的專案：發現任何舊版 ADF 痕跡就停止，改走 docs/upgrades/ 的移轉 SOP。
#
# 用法（在專案根目錄）：
#   irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.ps1 | iex
#   .\install.ps1 [-Agent claude-code] [-Version v5.2.0] [-Copy] [-Project <dir>]
param(
  [string]$Agent = $(if ($env:ADF_AGENT) { $env:ADF_AGENT } else { 'claude-code' }),
  [string]$Version = $(if ($env:ADF_VERSION) { $env:ADF_VERSION } else { 'v5.2.0' }),
  [string]$Project = '.',
  [switch]$Copy
)
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/chungtsai/adf-framework'
function Say($m) { Write-Host "[ADF] $m" }
# 用 throw 而非 exit：透過 irm | iex 執行時 exit 會關閉使用者的 PowerShell 視窗
function Fail($m) { throw "[ADF] 停止：$m" }
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
if (-not $Version.StartsWith('v')) { $Version = "v$Version" }

# 1. 前置條件
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail '找不到 Node.js；請安裝 Node.js 18 以上版本' }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Fail '找不到 npx；請安裝含 npm 的 Node.js' }
$major = [int](node -p 'process.versions.node.split(".")[0]')
if ($major -lt 18) { Fail "Node.js 版本為 $(node -v)，需要 18 以上" }
if (-not (Test-Path $Project -PathType Container)) { Fail "專案目錄不存在：$Project" }
Set-Location $Project
$root = (Get-Location).Path
if ($root -eq $HOME) { Fail '不可直接安裝在 home 目錄；請在專案根目錄執行' }

# 2. 全新專案檢查
if (Test-Path '.adf/migration.json') { Fail '此專案已安裝 ADF。驗收請執行 node <skill-root>/scripts/project.mjs VERIFY .；升級請依 docs/upgrades 的 SOP。' }
$found = @()
foreach ($p in '.adf', 'modules', 'standards') { if (Test-Path $p) { $found += $p } }
foreach ($d in '.agents/skills', '.claude/skills', '.codex/skills', '.agent/skills', '.gemini/skills', '.opencode/skills') {
  if (Test-Path $d) { Get-ChildItem $d -Filter 'adf-*' -Force | ForEach-Object { $found += "$d/$($_.Name)" } }
}
if ((Test-Path 'skills-lock.json') -and (Select-String -Path 'skills-lock.json' -Pattern 'chungtsai/adf-framework' -Quiet)) { $found += 'skills-lock.json（含 ADF 紀錄）' }
foreach ($f in 'CLAUDE.md', 'AGENTS.md') {
  if ((Test-Path $f) -and (Select-String -Path $f -Pattern 'framework/(review|templates)' -Quiet)) { $found += "$f（含舊版 ADF 引用）" }
}
if ($found.Count -gt 0) {
  Write-Host '[ADF] 偵測到既有 ADF 痕跡：' -ForegroundColor Yellow
  $found | ForEach-Object { Write-Host "        - $_" }
  Fail "這不是全新專案。請依 $Repo/tree/main/docs/upgrades 的 SOP 移轉，不要用一鍵安裝覆寫。"
}

# 3. 下載同版本原始檔（專案外暫存），用來比對安裝結果是否完整
$work = Join-Path ([IO.Path]::GetTempPath()) ("adf-install-" + [guid]::NewGuid())
New-Item -ItemType Directory $work | Out-Null
try {
  if ($env:ADF_SOURCE_DIR) { $src = $env:ADF_SOURCE_DIR } else {
    Say "下載 $Version 原始檔以供比對"
    $zip = Join-Path $work 'src.zip'
    try { Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/chungtsai/adf-framework/zip/refs/tags/$Version" -OutFile $zip }
    catch { Fail "無法下載 $Version；請確認版本存在且網路可連到 GitHub" }
    Expand-Archive $zip (Join-Path $work 'src')
    $src = (Get-ChildItem (Join-Path $work 'src') -Directory | Select-Object -First 1).FullName
  }
  $srcSkills = Join-Path $src 'skills'
  if (-not (Test-Path (Join-Path $srcSkills 'adf-project-install'))) { Fail "原始檔不完整：$srcSkills" }

  # 4. 專案層級安裝（Windows 若無法建立符號連結可加 -Copy）
  Say "安裝 ADF $Version 到 $root（Agent：$Agent）"
  $npxArgs = @('-y', 'skills', 'add', "$Repo/tree/$Version", '--skill', '*', '-a', $Agent, '-y')
  if ($Copy) { $npxArgs += '--copy' }
  & npx @npxArgs
  if ($LASTEXITCODE -ne 0) { Fail 'npx skills add 失敗' }

  # 5. 找到 adf-project-install
  $inst = @('.agents/skills', '.claude/skills') | Where-Object { Test-Path (Join-Path $_ 'adf-project-install/scripts/project.mjs') } | Select-Object -First 1
  if (-not $inst) { Fail '安裝後找不到 adf-project-install；請確認 Agent 名稱是否正確' }
  $tool = Join-Path $inst 'adf-project-install/scripts/project.mjs'

  # 6. 逐檔比對：每支 Skill 的 SKILL.md、scripts/、assets/、references/ 都必須在正確位置且內容一致
  Say '檢查安裝檔案完整性'
  $bad = 0; $total = 0
  foreach ($f in Get-ChildItem $srcSkills -Recurse -File) {
    $total++
    $rel = $f.FullName.Substring($srcSkills.Length + 1)
    $dst = Join-Path $inst $rel
    if (-not (Test-Path $dst -PathType Leaf)) { Write-Host "        缺少：$dst"; $bad++ }
    elseif ((Get-FileHash $f.FullName).Hash -ne (Get-FileHash $dst).Hash) { Write-Host "        內容不同：$dst"; $bad++ }
  }
  if ($bad -gt 0) { Fail "$bad 個檔案缺少或不一致（共 $total 個）。請重新執行；不要手動複製，否則與 skills-lock.json 不符。" }
  Say "檔案完整：$total 個檔案已就位於 $inst/"

  # 7. PLAN → APPLY → VERIFY（計畫檔放在專案外）
  $plan = Join-Path $work 'plan.json'
  Say 'PLAN（唯讀）'
  $out = node $tool PLAN $root
  $planExit = $LASTEXITCODE
  # WriteAllText 預設 UTF-8 無 BOM；Set-Content -Encoding utf8 在 PS 5.1 會加 BOM，導致 JSON.parse 失敗
  [IO.File]::WriteAllText($plan, ($out -join "`n"))
  if ($planExit -ne 0) { ((ConvertFrom-Json ($out -join "`n")).blockers) | ForEach-Object { Write-Host "        - $_" }; Fail 'PLAN 有 blockers，未寫入任何 .adf 設定。處理後可重跑 PLAN/APPLY（見 install-policy.md）。' }
  Say 'APPLY'
  node $tool APPLY $root $plan | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'APPLY 失敗' }
  Say 'VERIFY'
  node $tool VERIFY $root | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'VERIFY 失敗，安裝不可視為完成' }
} finally { Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }

Say "完成：ADF $Version 已安裝並通過 VERIFY。"
Say "建議 commit：skills-lock.json、$inst/、.adf/"
Say '下一步：在 Agent 中呼叫 adf-ask 或 adf-develop（NEW）開始第一個 Module。'
