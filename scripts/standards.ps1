# ADF 專案起始規範一鍵安裝（Windows PowerShell）
#
# 適用：已安裝 ADF（有 .adf/migration.json）的專案。選擇要採用的起始規範，寫入專案 standards/。
# 只新增檔案；既有同路徑或同 ID 的規範一律略過，不覆蓋。不修改 Skill、modules/、.adf/。
# 規範分兩類：建議項目預設全部安裝，輸入編號排除；選填項目輸入編號才安裝。
#
# 用法（在專案根目錄）：
#   irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/standards.ps1 | iex
#   .\standards.ps1 [-Recommended] [-Exclude 8,xss] [-Add 19,date] [-Status DRAFT|APPROVED] [-List] [-Yes] [-Project <dir>] [-Ref main]
#   .\standards.ps1 -Select date,sql-injection|1,4   # 只安裝指定項目（不套用建議項目）
# 沒有選擇參數時以編號互動選擇；寫入前會列出摘要並詢問確認；-Yes 或 ADF_YES=1 可略過（CI 使用）。
param(
  [string]$Select = '',
  [string]$Exclude = '',
  [string]$Add = '',
  [switch]$Recommended,
  [string]$Status = '',
  [string]$Project = '.',
  [string]$Ref = $(if ($env:ADF_REF) { $env:ADF_REF } else { 'main' }),
  [switch]$List,
  [switch]$Yes = [bool]$env:ADF_YES
)
$ErrorActionPreference = 'Stop'
function Say($m) { Write-Host "[ADF] $m" }
# 用 throw 而非 exit：透過 irm | iex 執行時 exit 會關閉使用者的 PowerShell 視窗
function Fail($m) { throw "[ADF] 停止：$m" }
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$Status = $Status.ToUpper()
if ($Status -and $Status -notin @('DRAFT', 'APPROVED')) { Fail '-Status 只能是 DRAFT 或 APPROVED' }
if ($Exclude -or $Add) { $Recommended = $true }
if ($Select -and $Recommended) { Fail '-Select 不能與 -Recommended、-Exclude、-Add 同時使用' }

# 1. 前置條件
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail '找不到 Node.js；請安裝 Node.js 18 以上版本' }
$nodeVersion = "$(node -v)".Trim()
if ($nodeVersion -notmatch '^v(\d+)\.') { Fail "無法判斷 Node.js 版本（node -v 輸出：$nodeVersion）" }
if ([int]$Matches[1] -lt 18) { Fail "Node.js 版本為 $nodeVersion，需要 18 以上" }
if (-not (Test-Path $Project -PathType Container)) { Fail "專案目錄不存在：$Project" }
Set-Location $Project
$root = (Get-Location).Path
if ($root -eq $HOME) { Fail '不可直接在 home 目錄執行；請在專案根目錄執行' }
if (-not (Test-Path '.adf/migration.json')) { Fail '此專案尚未安裝 ADF。請先執行一鍵安裝：irm https://raw.githubusercontent.com/chungtsai/adf-framework/main/scripts/install.ps1 | iex' }

# 2. 取得規範來源（專案外暫存）
$work = Join-Path ([IO.Path]::GetTempPath()) ("adf-standards-" + [guid]::NewGuid())
New-Item -ItemType Directory $work | Out-Null
try {
  $src = $env:ADF_SOURCE_DIR
  if (-not $src) {
    Say "下載規範來源（$Ref）"
    $zip = Join-Path $work 'src.zip'
    try { Invoke-WebRequest -UseBasicParsing "https://codeload.github.com/chungtsai/adf-framework/zip/$Ref" -OutFile $zip }
    catch { Fail "無法下載 $Ref；請確認分支或 tag 存在且網路可連到 GitHub" }
    Expand-Archive $zip (Join-Path $work 'src')
    $src = (Get-ChildItem (Join-Path $work 'src') -Directory | Select-Object -First 1).FullName
  }
  $tool = Join-Path $src 'skills/adf-project-install/scripts/project.mjs'
  if (-not (Test-Path $tool) -or -not (Test-Path (Join-Path $src 'skills/adf-project-install/references/standard-packs.json'))) {
    Fail "來源 $Ref 沒有起始規範（需要包含 standard-packs.json 的版本）"
  }
  $raw = & node $tool STANDARDS $root
  if ($LASTEXITCODE -ne 0) { Fail '無法讀取起始規範清單' }
  $packs = @(($raw -join "`n" | ConvertFrom-Json).packs)

  # 3. 列出可選規範
  $label = @{ available = '可安裝'; installed = '已安裝'; conflict = '已有同名規範，略過' }
  $heading = @{ recommended = '建議項目（預設全部安裝；不需要的輸入編號排除）'; optional = '選填項目（輸入編號才安裝）' }
  $cat = ''
  for ($i = 0; $i -lt $packs.Count; $i++) {
    $p = $packs[$i]
    if ($p.category -ne $cat) { $cat = $p.category; Say "$($heading[$cat])：" }
    Write-Host "  [$($i + 1)] $($p.title)（$($label[$p.state])）"
    Write-Host "      $($p.summary)"
    $targets = $p.standards | ForEach-Object { if ($_.state -eq 'available') { $_.target } else { "$($_.target)（$($label[$_.state])）" } }
    Write-Host "      適用：$($p.applies -join '、')；寫入：$($targets -join '、')"
  }
  if ($List) { return }

  # 4. 選擇：建議項目以編號排除，選填項目以編號加入（或 -Select 指定完整清單）
  if (-not $Select -and -not $Recommended) {
    $Exclude = try { Read-Host '[ADF] 要排除的建議項目編號（逗號或空白分隔；直接 Enter＝全部安裝；all＝全部不裝）' } catch { Fail '無法互動選擇；請用 -Recommended、-Exclude、-Add 或 -Select 指定，例如 -Recommended -Add date' }
    $Add = try { Read-Host '[ADF] 要加入的選填項目編號（逗號或空白分隔；直接 Enter＝不加入；all＝全部加入）' } catch { Fail '無法互動選擇；請用 -Recommended、-Exclude、-Add 或 -Select 指定' }
    $Recommended = $true
  }
  $selArgs = @('--dry-run')
  if ($Select) { $selArgs += @('--select', $Select) }
  else {
    $selArgs += '--recommended'
    if ("$Exclude".Trim()) { $selArgs += @('--exclude', "$Exclude".Trim()) }
    if ("$Add".Trim()) { $selArgs += @('--add', "$Add".Trim()) }
  }
  $planRaw = & node $tool STANDARDS $root @selArgs
  if ($LASTEXITCODE -ne 0) { Fail '選擇無效，請重新執行' }
  $plan = $planRaw -join "`n" | ConvertFrom-Json
  $ids = @($plan.ids)

  # 5. 寫入狀態
  if (-not $Status) {
    if ($Yes) { $Status = 'DRAFT' }
    else {
      Say '寫入狀態：'
      Say '  [1] DRAFT：之後用 adf-standard-authoring／adf-migration-rule-authoring 審查後再核准（建議）'
      Say '  [2] APPROVED：我已審閱內容，直接作為專案核准規範'
      $ans = try { Read-Host '[ADF] 請選擇 [1/2]（預設 1）' } catch { '' }
      $Status = switch ($ans) { '2' { 'APPROVED' } { $_ -in @('', '1') } { 'DRAFT' } default { Fail '請輸入 1 或 2' } }
    }
  }

  # 6. 寫入前確認
  Say '已選擇：'
  foreach ($id in $ids) { for ($i = 0; $i -lt $packs.Count; $i++) { if ($packs[$i].id -eq $id) { Write-Host "        [$($i + 1)] $($packs[$i].title)" } } }
  Say "即將以 $Status 狀態寫入 ${root}："
  $count = 0
  foreach ($s in $plan.standards) {
    if ($s.state -eq 'available') { $count++; Write-Host "        + $($s.target)（$($s.id)）" }
    else { Write-Host "        - 略過 $($s.target)（$($label[$s.state])）" }
  }
  if ($count -eq 0) { Say '選擇的規範都已存在，沒有需要寫入的檔案。'; return }
  Say '只新增上列檔案，不覆蓋既有規範，不修改 Skill、modules/、.adf/'
  if (-not $Yes) {
    $ans = try { Read-Host '[ADF] 確定要繼續嗎？[y/N]' } catch { Fail '無法互動確認；確認要執行請加 -Yes 或設定 ADF_YES=1' }
    if ($ans -notmatch '^(y|yes)$') { Say '已取消，未寫入任何檔案。'; return }
  }

  # 7. 寫入
  $out = & node $tool STANDARDS $root ($ids -join ',') --status $Status --ref $Ref
  if ($LASTEXITCODE -ne 0) { Fail '寫入失敗' }
  $result = $out -join "`n" | ConvertFrom-Json
  foreach ($w in $result.written) { Say "已寫入：$($w.target)（$($w.id)，$($w.status)）" }
  foreach ($s in $result.skipped) { $why = if ($s.reason -eq 'already installed') { '已安裝' } else { $s.reason -replace '^conflict with ', '已有同名規範：' }; Say "略過：$($s.target)（$why）" }
  Say '完成。建議 commit：standards/'
  if ($Status -eq 'DRAFT') { Say '下一步：在 Agent 中請 adf-standard-authoring（DEV-*）與 adf-migration-rule-authoring（MIG-*）審查 DRAFT 規範，核准後改為 APPROVED。' }
  else { Say '下一步：在 Agent 中以 adf-standards-applicability 判斷各 Module 適用哪些規範。' }
}
finally { Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue }
