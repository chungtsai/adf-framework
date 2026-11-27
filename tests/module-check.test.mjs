// Module 檢查工具原型（skills/adf-project-install/scripts/module-check.mjs），依 docs/proposals/module-format.md。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkModule, parseYaml, findIds, tables, YamlError, formatCoverage, sqlWrite, secretFindings, formatGate} from '../skills/adf-project-install/scripts/module-check.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repo, 'skills/adf-project-install/scripts/module-check.mjs');
const write = (r, p, c) => { fs.mkdirSync(path.dirname(path.join(r, p)), {recursive: true}); fs.writeFileSync(path.join(r, p), c); };

const MANIFEST = `module:
  id: account
  name: 帳號維護
  origin: NEW
work_item:
  id: WI-001
  type: NEW
  intents:
    - FEATURE
  title: 帳號查詢
  trigger:
    type: USER_REQUIREMENT
    standards: []
  base_ref: null # 沒有版控
  changes:
    added: [REQ-001, BR-001, TC-001]
    modified: []
    removed: []
behavior:
  change_allowed: true
  preserve: []
  approved_changes: []
impact:
  ui: unknown
  backend: unknown
  database: unknown
revalidation:
  required: false
  reason: null
  standards: []
status:
  analysis: done
  specification: done
  standards: pending
  prototype:
    status: not_applicable
    reason: 純查詢
  design: pending
  development:
    backend: pending
    frontend: pending
  verification:
    test_generation: pending
    execution: pending
    security: not_applicable
    legacy_baseline: not_applicable
    normalization: not_applicable
    comparison: not_applicable
    traceability: pending
    acceptance: pending
blockers: []
review:
  status: IN_PROGRESS
  questions:
    total: 0
    answered: 0
    unresolved: 0
  blockers: []
  approval:
    required: false
    approved: false
`;

const FILES = {
  'manifest.yaml': MANIFEST,
  'spec/requirements.md': `# Requirements

| ID | 名稱 | 描述 | Status |
|---|---|---|---|
| REQ-001 | 帳號查詢 | 可依帳號查詢 | APPROVED |
| REQ-002 | 帳號匯出 | 匯出 Excel | APPROVED |
`,
  'spec/rules.md': `# Rules

## Business Rules

| ID | 規則 | 條件 | 預期行為 | Source | Status |
|---|---|---|---|---|---|
| BR-001 | 停用帳號不顯示 | STATUS=N | 查詢結果不含停用帳號 | REQ-001 | APPROVED |

## Validation Rules

| ID | 規則 | 條件 | 預期行為 | Source | Status |
|---|---|---|---|---|---|
| VAL-001 | 帳號必填 | 帳號空白 | 顯示「請輸入帳號」 | REQ-001 | APPROVED |
`,
  'verification/functional-scenarios.md': `# Functional Scenarios

## Scenario Format

| ID | Source | Preconditions | Test Input | User Flow | UI Expected | Data Verification | Expected Data | Related Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| FS-001 | REQ-001 | 已登入 | account=TEST001 | 1. 開啟 2. 查詢 | 顯示 1 筆 | SQL | 1 筆 | TC-001 | APPROVED |
`,
  'verification/test-cases.md': `# Test Cases

| ID | Source | Scenario | Preconditions | Test Input | Steps | Expected Result | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| TC-001 | REQ-001、BR-001 | FS-001 | 已登入 | account=TEST001 | 1. 查詢 | 顯示 1 筆 | SELECT | VERIFIED |
| TC-002 | VAL-001 | | 已登入 | account= | 1. 查詢 | 顯示「請輸入帳號」 | 畫面 | APPROVED |
| TC-003 | REQ-002 | | 已登入 | — | 1. 匯出 | 下載 Excel | 檔案 | APPROVED |
`,
  'verification/traceability.md': `# Traceability

| Source | Rule | Standard | Design | Functional Scenario | Test | Result |
|---|---|---|---|---|---|---|
| REQ-001 | BR-001 | | 查詢 | FS-001 | TC-001 | PASS |
| REQ-001 | VAL-001 | | 查詢 | | TC-002 | PASS |
`,
  'specification.md': `# 規格書\n\n查詢依 REQ-001、BR-001，見 FS-001。審查問題 REV-Q-005 已解決。\n`,
};

function moduleDir(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adf-mc-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  write(root, '.adf/migration.json', '{"status":"verified"}');
  const dir = path.join(root, 'modules/account');
  for (const [p, c] of Object.entries({...FILES, ...overrides})) if (c !== null) write(dir, p, c);
  return {root, dir};
}
const codes = r => r.findings.map(f => f.code);
const only = (r, code) => r.findings.filter(f => f.code === code);
const edit = (file, from, to) => FILES[file].replace(from, to);

test('識別碼：REV-Q 不會被誤抓成 Q，規範子項完整保留', () => {
  assert.deepEqual(findIds('見 REV-Q-005，Source: REQ-001、BR-002；DEV-SEC-RATE-001-R2'), ['REV-Q-005', 'REQ-001', 'BR-002', 'DEV-SEC-RATE-001-R2']);
  assert.deepEqual(findIds('REQ-*、tc-001、XREQ-001、REQ-001a'), []);
});

test('表格：跳脫的 |、<br> 與粗體，程式碼區塊內的表格不讀', () => {
  const t = tables('## A\n\n| ID | 說明 |\n|---|---|\n| **REQ-001** | a \\| b<br>c |\n\n```\n| X | Y |\n|---|---|\n```\n');
  assert.equal(t.length, 1);
  assert.equal(t[0].section, 'A');
  assert.deepEqual(t[0].rows[0].cells, ['REQ-001', 'a | b\nc']);
  assert.equal(t[0].rows[0].line, 5);
});

test('manifest：支援的 YAML 子集，超出範圍明確拒絕', () => {
  const m = parseYaml(MANIFEST);
  assert.equal(m.work_item.base_ref, null);
  assert.deepEqual(m.work_item.intents, ['FEATURE']);
  assert.deepEqual(m.work_item.changes.added, ['REQ-001', 'BR-001', 'TC-001']);
  assert.deepEqual(parseYaml('a:\n- x\n- "y # z"\n'), {a: ['x', 'y # z']});
  assert.deepEqual(parseYaml('history:\n  - stage: rules\n    status: APPROVED\n  - stage: design\n    note: ok\n'),
    {history: [{stage: 'rules', status: 'APPROVED'}, {stage: 'design', note: 'ok'}]});
  for (const bad of ['a: |\n  text\n', 'a: &x 1\n', 'a:\n\tb: 1\n', 'a:\n   b: 1\n', 'a: 1\na: 2\n', 'a: {b: 1}\n'])
    assert.throws(() => parseYaml(bad), YamlError, bad);
});

test('完整且一致的 Module 沒有任何發現', t => {
  const r = checkModule(moduleDir(t).dir);
  assert.deepEqual(r.findings, []);
  assert.equal(r.module, 'modules/account');
  assert.equal(r.work_item, 'WI-001');
});

test('R-01 斷鏈與 L-12 不允許的前綴', t => {
  const r = checkModule(moduleDir(t, {
    'verification/test-cases.md': edit('verification/test-cases.md', '| TC-003 | REQ-002 | |', '| TC-003 | REQ-009 | TC-001 |'),
  }).dir);
  assert.deepEqual(only(r, 'R-01').map(f => [f.line, f.id, f.message]), [[7, 'TC-003', '「Source」引用的 REQ-009 不存在']]);
  assert.equal(only(r, 'L-12')[0].message, '「Scenario」不能引用 TC（允許：FS）');
  assert.ok(only(r, 'R-03').some(f => f.id === 'REQ-002'), '沒有 TC 驗證的 REQ-002 變成孤兒');
});

test('R-02 TC.Scenario 與 FS.Related Test 不一致（雙向）', t => {
  const {dir} = moduleDir(t, {
    'verification/functional-scenarios.md': edit('verification/functional-scenarios.md', '| TC-001 | APPROVED |', '| TC-002 | APPROVED |'),
  });
  const msgs = only(checkModule(dir), 'R-02').map(f => f.message);
  assert.deepEqual(msgs, [
    'FS-001 的 Related Test 有 TC-002，但 TC-002 的 Scenario 沒有填 FS-001',
    'TC-001 的 Scenario 是 FS-001，但 FS-001 的 Related Test 沒有列出 TC-001',
  ]);
});

test('R-03 孤兒：Rule 被 TC 驗證時，連帶視為其 Source REQ 已驗證', t => {
  const {dir} = moduleDir(t, {
    'verification/test-cases.md': edit('verification/test-cases.md', '| TC-001 | REQ-001、BR-001 |', '| TC-001 | BR-001 |'),
    'verification/traceability.md': '# Traceability\n',
  });
  assert.deepEqual(only(checkModule(dir), 'R-03'), []);
});

test('REMOVED：保留列不重複定義，有效列引用時 R-09，traceability 已定案的歷史列除外', t => {
  const {dir} = moduleDir(t, {
    'spec/requirements.md': edit('spec/requirements.md', '| 匯出 Excel | APPROVED |', '| 匯出 Excel（WI-001 刪除） | REMOVED |'),
    'verification/traceability.md': FILES['verification/traceability.md'] + '| REQ-002 | | | | | TC-003 | PASS |\n| REQ-002 | | | | | TC-003 | NOT_RUN |\n',
    'manifest.yaml': MANIFEST.replace('removed: []', 'removed: [REQ-002]'),
  });
  const r = checkModule(dir);
  assert.deepEqual(only(r, 'R-09').map(f => [f.file, f.line]), [['verification/test-cases.md', 7], ['verification/traceability.md', 8]]);
  assert.ok(!only(r, 'R-03').some(f => f.id === 'REQ-002'), 'REMOVED 不算孤兒');
  assert.deepEqual(only(r, 'R-04'), []);
});

test('R-04／M-08 本次變更紀錄', t => {
  const {dir} = moduleDir(t, {
    'manifest.yaml': MANIFEST.replace('added: [REQ-001, BR-001, TC-001]', 'added: [REQ-001, BR-009]').replace('modified: []', 'modified: [REQ-001]').replace('removed: []', 'removed: [TC-002]'),
  });
  const r = checkModule(dir);
  assert.deepEqual(only(r, 'M-08').map(f => f.id), ['REQ-001']);
  assert.deepEqual(only(r, 'R-04').map(f => f.message), [
    'changes.added 的 BR-009 找不到定義',
    'changes.removed 的 TC-002 狀態不是 REMOVED（verification/test-cases.md:6）',
  ]);
  const old = moduleDir(t, {'manifest.yaml': MANIFEST.replace(/  base_ref[\s\S]*?removed: \[\]\n/, '')});
  assert.deepEqual(only(checkModule(old.dir), 'R-04').map(f => f.level), ['INFO']);
});

test('R-07 狀態矛盾：VERIFIED 的 TC 其 Source 未核准；manifest 已完成但仍有未定案項目', t => {
  const {dir} = moduleDir(t, {
    'spec/rules.md': edit('spec/rules.md', '| REQ-001 | APPROVED |\n\n## Validation', '| REQ-001 | DRAFT |\n\n## Validation'),
    'verification/test-cases.md': edit('verification/test-cases.md', '| 下載 Excel | 檔案 | APPROVED |', '| 下載 Excel | 檔案 | REVIEW_REQUIRED |'),
    'manifest.yaml': MANIFEST.replace('test_generation: pending', 'test_generation: passed'),
  });
  assert.deepEqual(only(checkModule(dir), 'R-07').map(f => f.message), [
    'status.verification.test_generation 為 passed，但仍有未定案項目：TC-003',
    'TC-001 已是 VERIFIED，但 Source BR-001 的狀態是 DRAFT',
  ]);
});

test('格式：欄數、必要欄位、ID 語法、重複、狀態值、章節前綴、範圍、traceability 一列多 Test', t => {
  const {dir} = moduleDir(t, {
    'spec/rules.md': FILES['spec/rules.md'] + '| BR-002 | 放錯章節 | | 無 | REQ-001 | APPROVED |\n',
    'spec/requirements.md': FILES['spec/requirements.md'] + '| REQ-001 | 重複 | | APPROVED |\n| req-3 | 小寫 | | APPROVED |\n| REQ-004 | 狀態錯 | | OK |\n| REQ-005 | 欄數 | 少一欄 |\n',
    'verification/test-cases.md': FILES['verification/test-cases.md'] + '| TC-004 | REQ-001~REQ-002 | | | | | 範圍 | | DRAFT |\n',
    'verification/traceability.md': FILES['verification/traceability.md'] + '| REQ-002 | | | | | TC-003、TC-004 | FAIL |\n',
    'verification/functional-scenarios.md': '# Functional Scenarios\n\n| ID | Source | User Flow | Related Test | Status |\n|---|---|---|---|---|\n| FS-001 | REQ-001 | 查詢 | TC-001 | APPROVED |\n',
  });
  const r = checkModule(dir);
  for (const c of ['L-01', 'L-02', 'L-03', 'L-04', 'L-05', 'L-06', 'L-07', 'L-10']) assert.ok(codes(r).includes(c), c);
  assert.equal(only(r, 'L-02')[0].message, '「Functional Scenario」表格缺少必要欄位「UI Expected」');
  assert.equal(only(r, 'L-06')[0].message, 'BR-002 位於「Validation Rules」章節，前綴應為 VAL');
  assert.equal(only(r, 'L-10')[0].level, 'WARN');
});

test('需求的標題寫法相容；與表格混用時 L-13', t => {
  const heading = '# Requirements\n\n## REQ-001 帳號查詢\n可依帳號查詢。\nStatus: APPROVED\n\n## REQ-002：帳號匯出\n狀態：APPROVED\n';
  assert.deepEqual(checkModule(moduleDir(t, {'spec/requirements.md': heading}).dir).findings, []);
  const mixed = checkModule(moduleDir(t, {'spec/requirements.md': heading.replace('## REQ-002：帳號匯出\n狀態：APPROVED\n', '') + '\n| ID | 名稱 | Status |\n|---|---|---|\n| REQ-002 | 匯出 | APPROVED |\n'}).dir);
  assert.deepEqual(codes(mixed), ['L-13']);
});

test('R-06／R-01 專案規範：存在、子項規則與 APPROVED', t => {
  const {root, dir} = moduleDir(t, {
    'spec/standards.md': '# Applicable Standards\n\n| Standard | 版本 | 適用 | 理由 |\n|---|---|---|---|\n| DEV-SQL-001 | 1.0 | 適用 | |\n| DEV-DATE-001 | 1.0 | 適用 | |\n| MIG-X-001 | 1.0 | 不適用 | |\n',
    'verification/traceability.md': FILES['verification/traceability.md'].replace('| REQ-001 | BR-001 | |', '| REQ-001 | BR-001 | DEV-SQL-001-R2、DEV-SQL-001-R9 |'),
  });
  write(root, 'standards/development/sql.md', '---\nid: DEV-SQL-001\nversion: 1.0\nstatus: APPROVED\n---\n# SQL\n- **DEV-SQL-001-R1 參數化**\n- **DEV-SQL-001-R2 白名單**\n');
  write(root, 'standards/development/date.md', '---\nid: DEV-DATE-001\nstatus: DRAFT\n---\n# 日期\n');
  const r = checkModule(dir);
  assert.deepEqual(only(r, 'R-01').map(f => f.message), ['「Standard」引用的 MIG-X-001 在專案 standards/ 中不存在', '「Standard」引用的 DEV-SQL-001-R9 在專案 standards/ 中不存在']);
  assert.deepEqual(only(r, 'R-06').map(f => f.id), ['DEV-DATE-001']);
  assert.equal(only(r, 'L-14')[0].message, '適用為「不適用」時「理由」不可空白');
});

test('R-08 規格書提到不存在的 ID', t => {
  const r = checkModule(moduleDir(t, {'specification.md': FILES['specification.md'] + '另見 TC-099。\n'}).dir);
  assert.deepEqual(only(r, 'R-08').map(f => [f.line, f.id]), [[4, 'TC-099']]);
});

test('CLI：exit code 與 JSON 輸出', t => {
  const ok = spawnSync(process.execPath, [cli, moduleDir(t).dir, '--json'], {encoding: 'utf8'});
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout).summary, {error: 0, warn: 0, info: 0});
  const bad = spawnSync(process.execPath, [cli, moduleDir(t, {'verification/test-cases.md': edit('verification/test-cases.md', 'REQ-002 |', 'REQ-404 |')}).dir], {encoding: 'utf8'});
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /\[錯誤\] R-01 verification\/test-cases\.md:7/);
  const yaml = spawnSync(process.execPath, [cli, moduleDir(t, {'manifest.yaml': 'a: |\n  b\n'}).dir], {encoding: 'utf8'});
  assert.equal(yaml.status, 2);
  assert.match(yaml.stderr, /超出支援的 YAML 範圍/);
  assert.equal(spawnSync(process.execPath, [cli, path.join(os.tmpdir(), 'no-such-module-xyz')], {encoding: 'utf8'}).status, 2);
});

test('覆蓋率：完整 Module 全部涵蓋，分母為 0 的指標為 null', t => {
  const c = checkModule(moduleDir(t).dir).coverage;
  assert.deepEqual([c.requirement.covered, c.requirement.total], [2, 2]);
  assert.deepEqual([c.rules.BR.covered, c.rules.VAL.covered, c.rules.Q.total, c.rules.Q.ratio], [1, 1, 0, null]);
  assert.deepEqual([c.scenario.covered, c.scenario.total], [1, 1]);
  assert.deepEqual([c.changes.covered, c.changes.total], [2, 2], 'TC 不算在本次變更的分母');
  assert.equal(c.legacy, null);
  assert.deepEqual(c.acceptance.uncovered, ['REQ-001', 'BR-001']);
  assert.match(c.acceptance.note, /acceptance-WI-001\.md/);
  assert.deepEqual([c.execution.total, c.execution.PASS, c.execution.not_recorded], [3, 2, ['TC-003']]);
});

test('覆蓋率：只計已核准的 TC；只有 DRAFT 測試的項目另外列出；REMOVED 不算分母', t => {
  const {dir} = moduleDir(t, {
    'spec/requirements.md': FILES['spec/requirements.md'] + '| REQ-003 | 已刪除 | | REMOVED |\n| REQ-004 | 沒有測試 | | APPROVED |\n',
    'verification/test-cases.md': edit('verification/test-cases.md', '| 下載 Excel | 檔案 | APPROVED |', '| 下載 Excel | 檔案 | DRAFT |'),
  });
  const c = checkModule(dir).coverage;
  assert.deepEqual([c.requirement.covered, c.requirement.total, c.requirement.uncovered, c.requirement.draft_only], [1, 3, ['REQ-002', 'REQ-004'], ['REQ-002']]);
  assert.match(formatCoverage(c), /Requirement：1／3（33%）；未涵蓋：REQ-002、REQ-004；其中只有未核准測試：REQ-002/);
});

test('覆蓋率：經 traceability 或經 Rule 連回的也算涵蓋', t => {
  const {dir} = moduleDir(t, {
    'verification/test-cases.md': edit('verification/test-cases.md', '| TC-001 | REQ-001、BR-001 |', '| TC-001 | BR-001 |').replace('| TC-003 | REQ-002 |', '| TC-003 | VAL-001 |'),
    'verification/traceability.md': FILES['verification/traceability.md'] + '| REQ-002 | | | | | TC-003 | PASS |\n',
  });
  const c = checkModule(dir).coverage;
  assert.deepEqual(c.requirement.uncovered, []);
});

test('覆蓋率：Legacy 行為依 comparison 計算整體、高風險與通過率', t => {
  const {dir} = moduleDir(t, {
    'analysis/legacy-behavior.md': `# Legacy Behavior

## 行為清單

| ID | 入口 | 類別 | 行為 | 證據位置 | 確定度 | 風險 | 規則 | Status |
|---|---|---|---|---|---|---|---|---|
| LB-001 | 查詢 | 查詢 | 空白不加條件 | a.java:1 | CONFIRMED | NORMAL | | |
| LB-002 | 查詢 | 交易 | 失敗回滾 | a.java:2 | CONFIRMED | HIGH | | |
| LB-003 | 查詢 | 權限 | 管理者才可查 | | UNKNOWN | HIGH | | |
| LB-004 | 查詢 | 副作用 | 寫稽核 | a.java:4 | CONFIRMED | NORMAL | | |
| LB-005 | 查詢 | 分支 | 已刪除 | a.java:5 | CONFIRMED | HIGH | | REMOVED |
`,
    'verification/comparison.md': `# Result Comparison

## 差異清單

| TC | LB | 面向 | 欄位 | Legacy | Target | 分類 | 依據 | 處理 |
|---|---|---|---|---|---|---|---|---|
| TC-001 | LB-001 | 畫面 | name | A | A | PASS | — | — |
| TC-002 | LB-002 | DB 寫入 | cnt | 0 | 1 | MIGRATION_DEFECT | — | — |
| TC-002 | LB-002 | 畫面 | msg | X | X | PASS | — | — |
| TC-003 | LB-004 | 副作用 | log | 1 | — | TEST_DATA_PROBLEM | — | — |
`,
  });
  const l = checkModule(dir).coverage.legacy;
  assert.deepEqual([l.overall.covered, l.overall.total, l.overall.uncovered], [2, 4, ['LB-003', 'LB-004']], 'TEST_DATA_PROBLEM 不算已比對');
  assert.deepEqual([l.high_risk.covered, l.high_risk.total, l.high_risk.uncovered], [1, 2, ['LB-003']]);
  assert.deepEqual([l.pass.covered, l.pass.total, l.pass.uncovered], [1, 2, ['LB-002']]);
  assert.equal(l.unknown, 1);
});

test('覆蓋率：驗收只看本次 Work Item 清單的功能類 AC', t => {
  const {dir} = moduleDir(t);
  const ac = src => `# 驗收清單\n\n## 3. 驗收項目\n\n| AC ID | 類型 | 來源 ID | 驗收項目 | 操作步驟 | 預期結果 | 對應測試與目前結果 | 結果 | 備註 |\n|---|---|---|---|---|---|---|---|---|\n${src}`;
  write(dir, 'verification/acceptance-WI-001.md', ac('| AC-001 | 功能 | REQ-001 | 查詢 | | | TC-001 PASS | 待驗收 | |\n| AC-101 | 回歸 | BR-001 | 停用 | | | | 待驗收 | |\n'));
  write(dir, 'verification/acceptance-WI-000.md', ac('| AC-001 | 功能 | BR-001 | 舊的 | | | | 通過 | |\n'));
  const r = checkModule(dir);
  assert.deepEqual(r.findings, []);
  assert.deepEqual([r.coverage.acceptance.covered, r.coverage.acceptance.uncovered], [1, ['BR-001']]);
});

test('執行結果：每個 TC 取最後一次；一列多 Test 時只有 PASS 能套用到每個 TC', t => {
  const {dir} = moduleDir(t, {
    'verification/traceability.md': FILES['verification/traceability.md'] + '| REQ-001 | | | | | TC-001 | FAIL |\n| REQ-002 | | | | | TC-002、TC-003 | FAIL |\n',
  });
  const e = checkModule(dir).coverage.execution;
  assert.deepEqual([e.PASS, e.FAIL, e.UNCERTAIN, e.NOT_RECORDED, e.failed, e.uncertain], [0, 1, 2, 0, ['TC-001'], ['TC-002', 'TC-003']]);
  assert.match(formatCoverage(checkModule(dir).coverage), /執行（已核准的 TC 3 個）：PASS 0、FAIL 1、NOT_RUN 0、BLOCKED 0、結果不明 2、未記錄 0；失敗：TC-001；結果不明：TC-002、TC-003/);
});

test('L-08 SQL 判斷：只認 SQL 語法，字串與註解內的關鍵字不算', () => {
  assert.equal(sqlWrite("SELECT * FROM ACCOUNT WHERE STATUS = 'DELETE FROM X'"), null);
  assert.equal(sqlWrite('SELECT 1 -- 之後 DELETE FROM X\nFROM DUAL'), null);
  assert.equal(sqlWrite('確認 DELETE 成功、資料已 UPDATE'), null);
  assert.equal(sqlWrite("delete from ACCOUNT where ID='T1'"), 'DELETE FROM');
  assert.equal(sqlWrite('UPDATE ACCOUNT SET NAME = 1'), 'UPDATE ACCOUNT');
  assert.equal(sqlWrite('SELECT * FROM A WHERE ID = 1 FOR UPDATE'), 'FOR UPDATE');
  assert.equal(sqlWrite('CREATE OR REPLACE VIEW V AS SELECT 1'), 'CREATE OR');
});

test('L-08 表格與程式碼區塊：Verification 不可異動，Cleanup 須註明人工確認', t => {
  const fs_ = FILES['verification/functional-scenarios.md'] + `
## 資料異動驗證

\`\`\`sql
SELECT COUNT(*) FROM ACCOUNT WHERE ACCOUNT = 'TEST001';
\`\`\`

驗證後：

\`\`\`sql
DELETE FROM ACCOUNT WHERE ACCOUNT = 'TEST001';
\`\`\`

### Cleanup SQL

\`\`\`sql
DELETE FROM ACCOUNT WHERE ACCOUNT = 'TEST001';
\`\`\`

### Cleanup SQL（人工確認後執行）

\`\`\`sql
DELETE FROM ACCOUNT WHERE ACCOUNT = 'TEST001';
\`\`\`
`;
  const {dir} = moduleDir(t, {
    'verification/functional-scenarios.md': fs_,
    'verification/test-cases.md': edit('verification/test-cases.md', '| 畫面 | APPROVED |', "| UPDATE ACCOUNT SET STATUS='N' | APPROVED |"),
  });
  const r = only(checkModule(dir), 'L-08').map(f => [f.level, f.file, f.line]);
  assert.deepEqual(r, [
    ['ERROR', 'verification/functional-scenarios.md', 17],
    ['WARN', 'verification/functional-scenarios.md', 23],
    ['ERROR', 'verification/test-cases.md', 6],
  ]);
});

test('L-09 Secret：明確格式為 ERROR、關鍵字為 WARN、佔位字不報，訊息不含內容', t => {
  const fake = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
  assert.deepEqual(secretFindings('password: <測試密碼>\ntoken=${TOKEN}\n密碼：請洽管理者\npwd=***').length, 0);
  const {dir} = moduleDir(t, {
    'design/design.md': `# Design\n\n連線：jdbc:oracle://app:Sup3rS3cret@db01\n\nGitHub：${fake}\n\n測試帳號 password=Test1234\n`,
  });
  const r = only(checkModule(dir), 'L-09');
  assert.deepEqual(r.map(f => [f.level, f.file, f.line]), [['ERROR', 'design/design.md', 3], ['ERROR', 'design/design.md', 5], ['WARN', 'design/design.md', 7]]);
  assert.ok(r.every(f => !f.message.includes('Sup3rS3cret') && !f.message.includes(fake) && !f.message.includes('Test1234')));
});

test('M-01～M-07 manifest 結構', t => {
  const m = MANIFEST.replace('impact:\n  ui: unknown\n', 'impact:\n')
    .replace('title: 帳號查詢', 'title: CHANGE_ME')
    .replace('    - FEATURE', '    - FEATURE\n    - HOTFIX')
    .replace('origin: NEW', 'origin: LEGACY')
    .replace('  design: pending', '  design: in_review')
    .replace('    backend: pending', '    backend: finished')
    .replace('review:\n  status: IN_PROGRESS', 'review:\n  status: APPROVED')
    .replace('total: 0', 'total: 3').replace('unresolved: 0', 'unresolved: 1')
    .replace('    approved: false', '    approved: true');
  const r = checkModule(moduleDir(t, {'manifest.yaml': m}).dir);
  const msg = code => only(r, code).map(f => `${f.level} ${f.message}`);
  assert.deepEqual(msg('M-01'), ['ERROR 缺少欄位：impact.ui']);
  assert.deepEqual(msg('M-02'), ['ERROR 仍是 CHANGE_ME：work_item.title']);
  assert.deepEqual(msg('M-03').map(s => s.split('不在')[0]), ['ERROR work_item.intents 的「HOTFIX」', 'ERROR module.origin「LEGACY」']);
  assert.deepEqual(msg('M-05').map(s => s.split('」')[0]), ['ERROR status.development.backend 的「finished', 'WARN status.design 的「in_review']);
  assert.deepEqual(msg('M-06'), ['ERROR review.questions.total（3）應等於 answered（0）+ unresolved（1）']);
  assert.deepEqual(msg('M-07'), ['ERROR 仍有 1 個未解決問題，review.status 不可為 APPROVED']);
  const approvedOnly = checkModule(moduleDir(t, {'manifest.yaml': MANIFEST.replace('    approved: false', '    approved: true')}).dir);
  assert.match(only(approvedOnly, 'M-07')[0].message, /review\.status 必須是 APPROVED（目前：IN_PROGRESS）/);
});

test('M-04 既有系統導入情境的欄位組合', t => {
  const rv = MANIFEST.replace('    - FEATURE', '    - RETROFIT_VERIFY').replace('  type: NEW', '  type: MIGRATION');
  const r = checkModule(moduleDir(t, {'manifest.yaml': rv}).dir);
  assert.deepEqual(only(r, 'M-04').map(f => `${f.level} ${f.message.split('（')[0]}`), [
    'ERROR RETROFIT_VERIFY 的 module.origin 必須是 MIGRATION',
    'ERROR RETROFIT_VERIFY 的 behavior.change_allowed 必須是 false',
    'WARN RETROFIT_VERIFY 只驗證、不修改 Target，status.development.backend 應為 not_applicable',
    'WARN RETROFIT_VERIFY 只驗證、不修改 Target，status.development.frontend 應為 not_applicable',
  ]);
  const ba = MANIFEST.replace('    - FEATURE', '    - BASELINE_ADOPTION').replace('change_allowed: true', 'change_allowed: false')
    .replace('    backend: pending\n    frontend: pending', '    backend: not_applicable\n    frontend: not_applicable').replace('    required: false', '    required: true');
  assert.deepEqual(only(checkModule(moduleDir(t, {'manifest.yaml': ba}).dir), 'M-04'), []);
});

const skipGit = spawnSync('git', ['--version']).status !== 0;
const gitRun = (cwd, ...args) => {
  const r = spawnSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], {cwd, encoding: 'utf8'});
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};

test('M-09／R-05 版控：base_ref 不可改寫；changes 與實際差異比對', {skip: skipGit}, t => {
  // 基準 commit：前一個 Work Item（WI-000）已完成時的 Module
  const {root, dir} = moduleDir(t, {'manifest.yaml': MANIFEST.replace('id: WI-001', 'id: WI-000').replace(/  changes:\n[\s\S]*?removed: \[\]\n/, '  changes:\n    added: []\n    modified: []\n    removed: []\n')});
  gitRun(root, 'init', '-q');
  gitRun(root, 'add', '-A');
  gitRun(root, 'commit', '-q', '-m', 'base');
  const base = gitRun(root, 'rev-parse', 'HEAD');
  // 建立 Work Item：記下 base_ref 並提交
  const wi = MANIFEST.replace('base_ref: null # 沒有版控', `base_ref: ${base}`);
  const setManifest = changes => write(dir, 'manifest.yaml', wi.replace(/  changes:\n[\s\S]*?removed: \[\]\n/, changes));
  setManifest('  changes:\n    added: []\n    modified: []\n    removed: []\n');
  gitRun(root, 'commit', '-q', '-am', 'start WI-001');

  // 本次實際變更：新增 REQ-003、修改 BR-001 的預期行為、刪除 VAL-001（標 REMOVED）、TC-002 改 Source；TC-003 只改 Status（不算修改）
  write(dir, 'spec/requirements.md', FILES['spec/requirements.md'] + '| REQ-003 | 帳號列印 | 列印清單 | APPROVED |\n');
  write(dir, 'spec/rules.md', FILES['spec/rules.md'].replace('查詢結果不含停用帳號', '查詢結果不含停用與鎖定帳號').replace('| 顯示「請輸入帳號」 | REQ-001 | APPROVED |', '| 顯示「請輸入帳號」 | REQ-001 | REMOVED |'));
  write(dir, 'verification/test-cases.md', edit('verification/test-cases.md', '| 畫面 | APPROVED |', '| 畫面 | DRAFT |').replace('| TC-002 | VAL-001 |', '| TC-002 | REQ-001 |').replace('| 檔案 | APPROVED |', '| 檔案 | DRAFT |'));

  setManifest('  changes:\n    added: [REQ-003]\n    modified: [BR-001, TC-002]\n    removed: [VAL-001]\n');
  let r = checkModule(dir);
  assert.deepEqual(only(r, 'R-05'), [], JSON.stringify(only(r, 'R-05')));
  assert.deepEqual(only(r, 'M-09'), []);

  // 漏登記、登記錯類別、登記了沒有差異的 ID
  setManifest('  changes:\n    added: [BR-001, TC-001]\n    modified: []\n    removed: [VAL-001]\n');
  r = checkModule(dir);
  assert.deepEqual(only(r, 'R-05').map(f => f.message.replace(/（[0-9a-f]{7}）/, '（hash）')), [
    'REVIEW_REQUIRED：changes.added 登記了 TC-001，但與 base_ref（hash）相比沒有對應差異',
    'REVIEW_REQUIRED：REQ-003 與 base_ref（hash）相比為新增，但 changes.added 沒有登記',
    'REVIEW_REQUIRED：BR-001 登記在 changes.added，但與 base_ref（hash）相比實際為修改',
    'REVIEW_REQUIRED：TC-002 與 base_ref（hash）相比為修改，但 changes.modified 沒有登記（只改錯字或格式、行為不變時可不登記，請 Human 確認）',
  ]);

  // 整列刪除
  write(dir, 'spec/requirements.md', FILES['spec/requirements.md'].replace('| REQ-002 | 帳號匯出 | 匯出 Excel | APPROVED |\n', '') + '| REQ-003 | 帳號列印 | 列印清單 | APPROVED |\n');
  assert.ok(only(checkModule(dir), 'R-05').some(f => f.id === 'REQ-002' && /整列被刪除/.test(f.message)));

  // base_ref 被改寫
  write(dir, 'manifest.yaml', wi.replace(base, gitRun(root, 'rev-parse', 'HEAD')));
  assert.match(only(checkModule(dir), 'M-09')[0].message, /建立後不得改寫/);
  write(dir, 'manifest.yaml', wi.replace(base, 'deadbeef'));
  assert.deepEqual(only(checkModule(dir), 'M-09').map(f => f.level), ['ERROR', 'WARN']);
});

test('M-09 放寬：建立時 base_ref 為 null，導入 git 後補一次 commit 允許；補上後不得再改寫或改回 null', {skip: skipGit}, t => {
  const {root, dir} = moduleDir(t);
  gitRun(root, 'init', '-q');
  gitRun(root, 'add', '-A');
  gitRun(root, 'commit', '-q', '-m', 'WI-001 建立時沒有版控，base_ref 為 null');
  const c1 = gitRun(root, 'rev-parse', 'HEAD');
  const setBase = v => write(dir, 'manifest.yaml', MANIFEST.replace('base_ref: null # 沒有版控', `base_ref: ${v}`));

  setBase(c1);
  let r = only(checkModule(dir), 'M-09');
  assert.deepEqual(r.map(f => f.level), ['INFO'], '尚未提交補上的值時即視為補一次');
  assert.match(r[0].message, /導入版控後補一次是允許的/);
  gitRun(root, 'commit', '-q', '-am', '補上 base_ref');
  assert.deepEqual(only(checkModule(dir), 'M-09'), [], '提交後補上的值就是正式的第一次記錄，不再提示');

  gitRun(root, 'commit', '-q', '--allow-empty', '-m', 'next');
  setBase(gitRun(root, 'rev-parse', 'HEAD'));
  r = only(checkModule(dir), 'M-09');
  assert.deepEqual(r.map(f => f.level), ['ERROR']);
  assert.match(r[0].message, new RegExp(`第一次記錄（[0-9a-f]{7}）為 ${c1}`));

  setBase('null');
  assert.match(only(checkModule(dir), 'M-09')[0].message, /目前為 null/);
});

// ---------- 結案預檢 ----------
const READY_MANIFEST = MANIFEST
  .replace(/status:\n  analysis[\s\S]*?blockers: \[\]\nreview:/, `status:
  analysis: done
  specification: done
  standards: done
  prototype:
    status: not_applicable
    reason: 純查詢
  design: done
  development:
    backend: done
    frontend: done
  verification:
    test_generation: done
    execution: done
    security: not_applicable
    legacy_baseline: not_applicable
    normalization: not_applicable
    comparison: not_applicable
    traceability: done
    acceptance: passed
blockers: []
review:`)
  .replace('  status: IN_PROGRESS', '  status: APPROVED');
const ACCEPTANCE = `# 驗收清單：WI-001

## 3. 驗收項目

| AC ID | 類型 | 來源 ID | 驗收項目 | 操作步驟 | 預期結果 | 對應測試與目前結果 | 結果 | 備註 |
|---|---|---|---|---|---|---|---|---|
| AC-001 | 功能 | REQ-001、BR-001 | 查詢 | | | TC-001 PASS | 通過 | |

## 5. 簽核

| 驗收人 | 日期 | 結論 | 說明 |
|---|---|---|---|
| 王小明 | 2026-11-27 | 通過 | |
`;
const READY = {
  'manifest.yaml': READY_MANIFEST,
  'verification/traceability.md': FILES['verification/traceability.md'] + '| REQ-002 | | | 匯出 | | TC-003 | PASS |\n',
  'verification/acceptance-WI-001.md': ACCEPTANCE,
  'spec/standards.md': '# Applicable Standards\n\n| Standard | 版本 | 適用 | 理由 |\n|---|---|---|---|\n',
};
const gateOf = (t, overrides = {}) => checkModule(moduleDir(t, {...READY, ...overrides}).dir, {gate: true}).gate;
const states = g => Object.fromEntries(g.gates.map(x => [x.id, x.state]));

test('結案預檢：全部 Gate 通過時為 READY，並註明結論不等於核准', t => {
  const g = gateOf(t);
  assert.deepEqual(Object.entries(states(g)).filter(([, v]) => v !== 'PASS'), [['G-08', 'NOT_APPLICABLE']]);
  assert.equal(g.verdict, 'READY');
  assert.match(formatGate(g), /結論：工具沒有找到阻擋項目\n工具的結論不等於核准/);
});

test('結案預檢：各 Gate 的阻擋條件', t => {
  const s = states(gateOf(t, {
    'manifest.yaml': READY_MANIFEST.replace('  design: done', '  design: pending').replace('acceptance: passed', 'acceptance: in_review')
      .replace('blockers: []\nreview:', 'blockers:\n  - 等待資安掃描\nreview:').replace('unresolved: 0', 'unresolved: 1').replace('total: 0', 'total: 1'),
    'spec/rules.md': FILES['spec/rules.md'].replace('| 顯示「請輸入帳號」 | REQ-001 | APPROVED |', '| 顯示「請輸入帳號」 | REQ-001 | REVIEW_REQUIRED |'),
    'verification/traceability.md': READY['verification/traceability.md'].replace('| TC-003 | PASS |', '| TC-003 | FAIL |'),
    'spec/standards.md': '# Applicable Standards\n\n| Standard | 版本 | 適用 | 理由 |\n|---|---|---|---|\n| DEV-SQL-001 | 1.0 | CONFLICT | 與既有寫法衝突 |\n',
  }));
  for (const id of ['G-02', 'G-03', 'G-04', 'G-05', 'G-06', 'G-11', 'G-12']) assert.equal(s[id], 'BLOCKED', id);
});

test('結案預檢：Traceability 未涵蓋、FS 缺測試、規格書不同步', t => {
  const g = gateOf(t, {
    'spec/requirements.md': FILES['spec/requirements.md'] + '| REQ-003 | 列印 | | APPROVED |\n',
    'verification/functional-scenarios.md': FILES['verification/functional-scenarios.md'] + '| FS-002 | REQ-002 | 已登入 | | 1. 匯出 | 下載 | | | | APPROVED |\n',
    'specification.md': FILES['specification.md'] + '另見 TC-099。\n',
  });
  assert.deepEqual([states(g)['G-07'], states(g)['G-09'], states(g)['G-10']], ['BLOCKED', 'BLOCKED', 'BLOCKED']);
  assert.match(g.gates.find(x => x.id === 'G-07').reasons[0], /Requirement 未涵蓋：REQ-003/);
});

test('結案預檢：驗收清單未簽核或有未通過項目', t => {
  const unsigned = gateOf(t, {'verification/acceptance-WI-001.md': ACCEPTANCE.replace('| 王小明 | 2026-11-27 | 通過 | |', '| | | `通過`／`有條件通過`／`不通過` | |')});
  assert.deepEqual(unsigned.gates.find(x => x.id === 'G-11').reasons, ['簽核表沒有 Human 填寫的結論']);
  const failed = gateOf(t, {'verification/acceptance-WI-001.md': ACCEPTANCE.replace('| TC-001 PASS | 通過 |', '| TC-001 PASS | 待驗收 |')});
  assert.match(failed.gates.find(x => x.id === 'G-11').reasons[0], /AC-001（待驗收）/);
  const old = gateOf(t, {'manifest.yaml': READY_MANIFEST.replace('    acceptance: passed\n', '')});
  assert.equal(states(old)['G-11'], 'HUMAN');
});

test('結案預檢：MIGRATION 需要比對，高風險未涵蓋交 Human 決定', t => {
  const mig = READY_MANIFEST.replace('  type: NEW', '  type: MIGRATION').replace('  origin: NEW', '  origin: MIGRATION');
  const noCmp = gateOf(t, {'manifest.yaml': mig});
  assert.equal(states(noCmp)['G-04'], 'BLOCKED', 'MIGRATION 的 comparison 不可 not_applicable');
  assert.equal(states(noCmp)['G-08'], 'BLOCKED');
  const lb = `# Legacy Behavior\n\n## 行為清單\n\n| ID | 入口 | 類別 | 行為 | 證據位置 | 確定度 | 風險 | 規則 |\n|---|---|---|---|---|---|---|---|\n| LB-001 | 查詢 | 查詢 | 空白不加條件 | a:1 | CONFIRMED | NORMAL | BR-001 |\n| LB-002 | 查詢 | 交易 | 失敗回滾 | a:2 | CONFIRMED | HIGH | |\n`;
  const cmp = `# Result Comparison\n\n## 差異清單\n\n| TC | LB | 面向 | 欄位 | Legacy | Target | 分類 | 依據 | 處理 |\n|---|---|---|---|---|---|---|---|---|\n| TC-001 | LB-001 | 畫面 | name | A | A | PASS | — | — |\n`;
  const g = gateOf(t, {'manifest.yaml': mig.replace('    comparison: not_applicable', '    comparison: done'), 'analysis/legacy-behavior.md': lb, 'verification/comparison.md': cmp});
  assert.equal(states(g)['G-08'], 'HUMAN');
  assert.match(g.gates.find(x => x.id === 'G-08').reasons[0], /未涵蓋的高風險 LB：LB-002/);
  const defect = gateOf(t, {'manifest.yaml': mig.replace('    comparison: not_applicable', '    comparison: done'), 'analysis/legacy-behavior.md': lb, 'verification/comparison.md': cmp.replace('| PASS | — | — |', '| MIGRATION_DEFECT | — | — |')});
  assert.equal(states(defect)['G-08'], 'BLOCKED');
});

test('結案預檢 CLI：exit code 0 READY、1 BLOCKED、3 HUMAN_REQUIRED', t => {
  const run = dir => spawnSync(process.execPath, [cli, dir, '--gate'], {encoding: 'utf8'});
  assert.equal(run(moduleDir(t, READY).dir).status, 0);
  const human = run(moduleDir(t, {...READY, 'specification.md': null}).dir);
  assert.equal(human.status, 3, human.stdout);
  assert.match(human.stdout, /結論：待 Human 確認/);
  const blocked = run(moduleDir(t, {...READY, 'manifest.yaml': READY_MANIFEST.replace('  design: done', '  design: pending')}).dir);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /\[阻擋\] G-04 各 Stage 狀態\n      - 尚未完成：status\.design（pending）/);
});

test('相容實務寫法：rules 標題、REQ/說明欄名、status.*.reason、traceability 引用 Rule', t => {
  const manifest = READY_MANIFEST
    .replace('  standards: done', '  standards:\n    status: not_applicable\n    reason: "Baseline Adoption 不套用"')
    .replace('  design: done', '  design:\n    status: not_applicable\n    reason: "不新增設計"') +
    '  history:\n    - stage: rules\n      status: APPROVED\n';
  const reqs = `# Requirements\n\n| REQ | 說明 | Status |\n|---|---|---|\n| REQ-001 | 帳號查詢 | APPROVED |\n| REQ-002 | 匯出 | APPROVED |\n`;
  const rules = `# Rules\n\n## Business Rules\n\n### BR-001：只查有效\n- **Source**：REQ-001\n- **Status**：APPROVED\n\n## Validation Rules\n\n### VAL-001：日期格式\n- **Source**：REQ-001\n- **Status**：APPROVED\n`;
  const trace = READY['verification/traceability.md'] + '| VAL-001 | | | | | TC-001 | PASS |\n';
  const r = checkModule(moduleDir(t, {
    ...READY,
    'manifest.yaml': manifest,
    'spec/requirements.md': reqs,
    'spec/rules.md': rules,
    'verification/traceability.md': trace,
  }).dir, {gate: true});
  assert.deepEqual(r.findings, []);
  assert.equal(r.gate.verdict, 'READY');
  // 標題寫法的章節前綴錯誤（L-06）與混用表格/標題（L-13）仍會被抓出
  const badRules = rules + '\n### BR-002：放錯章節\n- **Source**：REQ-001\n- **Status**：APPROVED\n\n## Validation Rules\n\n| ID | 規則 | 預期行為 | Source | Status |\n|---|---|---|---|---|\n| VAL-002 | 混用表格 | 報錯 | REQ-001 | APPROVED |\n';
  const r2 = checkModule(moduleDir(t, {'spec/rules.md': badRules}).dir);
  assert.ok(only(r2, 'L-06').some(f => f.id === 'BR-002'));
  assert.equal(only(r2, 'L-13').length, 1);
});
