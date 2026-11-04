# ADF 已安裝專案一鍵更新（Windows PowerShell）
#
# 適用：已用 adf-project-install 完成導入（有 .adf/migration.json）的專案。
# 全新專案請用 install.ps1；尚未導入 v5.1 的 v5.0 專案請依 docs/upgrades 的 SOP。
# 只更新 Skill 與 skills-lock.json；不碰 standards/、modules/、CLAUDE.md、AGENTS.md、.adf/。
#
# 用法（在專案根目錄）：
#   irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/update.ps1 | iex
#   .\update.ps1 [-Version v5.2.0] [-Agent claude-code] [-Copy|-NoCopy] [-Force] [-Yes] [-Project <dir>]
# 寫入任何檔案前會列出摘要並詢問確認；-Yes 或 ADF_YES=1 可略過（CI 使用）。
param(
  [string]$Agent = $env:ADF_AGENT,
  [string]$Version = $(if ($env:ADF_VERSION) { $env:ADF_VERSION } else { 'v5.2.0' }),
  [string]$Project = '.',
  [switch]$Copy,
  [switch]$NoCopy,
  [switch]$Force,
  [switch]$Yes = [bool]$env:ADF_YES
)
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/chungtsai/adf-framework'
function Say($m) { Write-Host "[ADF] $m" }
# 用 throw 而非 exit：透過 irm | iex 執行時 exit 會關閉使用者的 PowerShell 視窗
function Fail($m) { throw "[ADF] 停止：$m" }
function ReadJson($p) { [IO.File]::ReadAllText((Resolve-Path $p).Path) | ConvertFrom-Json }
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
if (-not $Version.StartsWith('v')) { $Version = "v$Version" }
$target = $Version.Substring(1)

# 1. 前置條件
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail '找不到 Node.js；請安裝 Node.js 18 以上版本' }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { Fail '找不到 npx；請安裝含 npm 的 Node.js' }
# 在 PowerShell 內解析 node -v：Windows PowerShell 5.1 會去掉傳給外部程式參數中的雙引號
$nodeVersion = "$(node -v)".Trim()
if ($nodeVersion -notmatch '^v(\d+)\.') { Fail "無法判斷 Node.js 版本（node -v 輸出：$nodeVersion）" }
if ([int]$Matches[1] -lt 18) { Fail "Node.js 版本為 $nodeVersion，需要 18 以上" }
if (-not (Test-Path $Project -PathType Container)) { Fail "專案目錄不存在：$Project" }
Set-Location $Project
$root = (Get-Location).Path
if ($root -eq $HOME) { Fail '不可直接在 home 目錄執行；請在專案根目錄執行' }

# 2. 必須是已完成導入的專案
if (-not (Test-Path '.adf/migration.json')) {
  if ((Test-Path '.adf') -or (Test-Path 'modules') -or (Test-Path 'standards')) { Fail "找不到 .adf/migration.json：此專案尚未完成 adf-project-install 導入，請依 $Repo/tree/main/docs/upgrades 的 SOP 移轉。" }
  Fail '此專案尚未安裝 ADF。全新專案請改用：irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.ps1 | iex'
}
$inst = @('.claude/skills', '.agents/skills') | Where-Object { Test-Path (Join-Path $_ 'adf-project-install/scripts/project.mjs') } | Select-Object -First 1
if (-not $inst) { Fail '找不到已安裝的 adf-project-install（.claude/skills 或 .agents/skills）；請依 docs/upgrades 的 SOP 處理。' }
$tool = Join-Path $inst 'adf-project-install/scripts/project.mjs'
$current = (ReadJson (Join-Path $inst 'adf-project-install/references/release.json')).version

# 3. 沿用目前的 Agent 與安裝模式（可用參數覆寫）
if (-not $Agent) { $Agent = if (Test-Path '.claude/skills/adf-project-install') { 'claude-code' } else { 'codex' } }
$item = Get-Item (Join-Path $inst 'adf-project-install') -Force
$isLink = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
if ($Copy) { $useCopy = $true } elseif ($NoCopy) { $useCopy = $false }
else { $useCopy = (-not $isLink) -and ($inst -eq '.claude/skills') -and -not (Test-Path '.agents/skills/adf-project-install') }
Say "目前版本：v$current；目標版本：$Version（Agent：$Agent，模式：$(if ($useCopy) { 'copy' } else { 'link' })）"

$work = Join-Path ([IO.Path]::GetTempPath()) ("adf-update-" + [guid]::NewGuid())
New-Item -ItemType Directory $work | Out-Null
$keepWork = $false
try {
  # 4. 更新前檢查：目前安裝必須通過 VERIFY（含 Skill 未被手動修改）
  $pre = node $tool VERIFY $root 2>&1
  if ($LASTEXITCODE -ne 0) {
    $pre | ForEach-Object { Write-Host "        $_" }
    if (-not $Force) { Fail '目前安裝未通過 VERIFY（常見原因：Skill 被手動修改）。請先把客製內容移到 standards/ 或專案外；確認可以覆蓋時加 -Force。' }
    Say '已指定 -Force，略過更新前 VERIFY'
  }
  if (($current -eq $target) -and -not $Force) {
    Say "已是最新：v$current，且通過 VERIFY；不需要更新。（重新安裝請加 -Force）"
    return
  }

  # 5. 下載目標版本原始檔（專案外暫存）
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
  $srcVersion = (ReadJson (Join-Path $srcSkills 'adf-project-install/references/release.json')).version
  if ($srcVersion -ne $target) { Fail "原始檔版本為 $srcVersion，與目標 $Version 不符" }
  $toolVersion = ''
  try { $toolVersion = (ReadJson '.adf/project.yaml').tool_version } catch { }
  $registry = ReadJson (Join-Path $srcSkills 'adf-project-install/references/resources.json')
  $compatible = if ($registry.compatible_tool_versions) { @($registry.compatible_tool_versions) } else { @($registry.version) }
  if ($compatible -notcontains $toolVersion) { Fail "$Version 不接受目前 .adf/project.yaml（tool_version=$toolVersion）；這次升級需要依 $Repo/tree/main/docs/upgrades 的 SOP 進行。" }

  # 寫入前確認
  Say "即將更新：v$current → $Version（$root）"
  Say "會改變：$inst/adf-*、skills-lock.json（先備份到專案外，失敗自動還原）；不修改 standards/、modules/、.adf/"
  if (-not $Yes) {
    $ans = try { Read-Host '[ADF] 確定要繼續嗎？[y/N]' } catch { Fail '無法互動確認；確認要執行請加 -Yes 或設定 ADF_YES=1' }
    if ($ans -notmatch '^(y|yes)$') { Say '已取消，未寫入任何檔案。'; return }
  }

  # 6. 備份目前的 Skill 與 skills-lock.json（專案外）
  Say '備份目前的 Skill 與 skills-lock.json'
  $backup = Join-Path $work 'backup'
  New-Item -ItemType Directory $backup | Out-Null
  Copy-Item 'skills-lock.json' (Join-Path $backup 'skills-lock.json')
  $dirs = @('.agents/skills', '.claude/skills')
  $links = @()
  foreach ($d in $dirs) {
    if (-not (Test-Path $d)) { continue }
    $bd = Join-Path $backup $d; New-Item -ItemType Directory $bd -Force | Out-Null
    foreach ($s in Get-ChildItem $d -Filter 'adf-*' -Force) {
      if ($s.Attributes -band [IO.FileAttributes]::ReparsePoint) { $links += [pscustomobject]@{ Path = "$d/$($s.Name)"; Target = @($s.Target)[0] } }
      else { Copy-Item $s.FullName (Join-Path $bd $s.Name) -Recurse }
    }
  }
  function Rollback {
    Write-Host '[ADF] 還原更新前的 Skill 與 skills-lock.json' -ForegroundColor Yellow
    try {
      foreach ($d in $dirs) {
        if (Test-Path $d) { Get-ChildItem $d -Filter 'adf-*' -Force | ForEach-Object { if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { $_.Delete() } else { Remove-Item $_.FullName -Recurse -Force } } }
        $bd = Join-Path $backup $d
        if (Test-Path $bd) { New-Item -ItemType Directory $d -Force | Out-Null; Get-ChildItem $bd -Force | ForEach-Object { Copy-Item $_.FullName (Join-Path $d $_.Name) -Recurse } }
      }
      foreach ($l in $links) { New-Item -ItemType SymbolicLink -Path $l.Path -Target $l.Target | Out-Null }
      Copy-Item (Join-Path $backup 'skills-lock.json') 'skills-lock.json' -Force
      node $tool VERIFY $root 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'VERIFY' }
      Write-Host "[ADF] 已還原為 v$current，並通過 VERIFY。" -ForegroundColor Yellow
    } catch {
      $script:keepWork = $true
      Write-Host "[ADF] 自動還原未完成；更新前備份保留在：$backup" -ForegroundColor Yellow
    }
  }
  function Abort($m) { Rollback; Fail $m }

  # 7. 專案層級重新安裝全部 Skill
  Say "更新 ADF 到 $Version"
  $npxArgs = @('-y', 'skills', 'add', "$Repo/tree/$Version", '--skill', '*', '-a', $Agent, '-y')
  if ($useCopy) { $npxArgs += '--copy' }
  & npx @npxArgs
  if ($LASTEXITCODE -ne 0) { Abort 'npx skills add 失敗' }

  # 8. 逐檔比對
  $newInst = @('.claude/skills', '.agents/skills') | Where-Object { Test-Path (Join-Path $_ 'adf-project-install/scripts/project.mjs') } | Select-Object -First 1
  if (-not $newInst) { Abort '更新後找不到 adf-project-install' }
  Say '檢查安裝檔案完整性'
  $bad = 0; $total = 0
  foreach ($f in Get-ChildItem $srcSkills -Recurse -File) {
    $total++
    $rel = $f.FullName.Substring($srcSkills.Length + 1)
    $dst = Join-Path $newInst $rel
    if (-not (Test-Path $dst -PathType Leaf)) { Write-Host "        缺少：$dst"; $bad++ }
    elseif ((Get-FileHash $f.FullName).Hash -ne (Get-FileHash $dst).Hash) { Write-Host "        內容不同：$dst"; $bad++ }
  }
  if ($bad -gt 0) { Abort "$bad 個檔案缺少或不一致（共 $total 個）" }
  $tool = Join-Path $newInst 'adf-project-install/scripts/project.mjs'

  # 9. 以新版工具 VERIFY
  Say 'VERIFY'
  $post = node $tool VERIFY $root 2>&1
  if ($LASTEXITCODE -ne 0) { $post | ForEach-Object { Write-Host "        $_" }; Abort '新版 VERIFY 失敗，更新不可視為完成' }

  Say "完成：ADF v$current → $Version，已通過 VERIFY。專案文件與核准狀態未變動。"
  Say "版本說明：$Repo/blob/$Version/docs/releases/$($target.Substring(0, $target.LastIndexOf('.'))).md"
  Say "建議 commit：skills-lock.json、$newInst/"
} finally { if (-not $keepWork) { Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue } }
