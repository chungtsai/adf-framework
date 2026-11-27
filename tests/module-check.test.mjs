// Module 檢查工具原型（skills/adf-project-install/scripts/module-check.mjs），依 docs/proposals/module-format.md。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {checkModule, parseYaml, findIds, tables, YamlError} from '../skills/adf-project-install/scripts/module-check.mjs';

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
  base_ref: null # 沒有版控
  changes:
    added: [REQ-001, BR-001, TC-001]
    modified: []
    removed: []
status:
  verification:
    test_generation: pending
    acceptance: pending
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
  for (const bad of ['a: |\n  text\n', 'a: &x 1\n', 'a:\n\tb: 1\n', 'a:\n   b: 1\n', 'a: 1\na: 2\n', 'a:\n  - b: 1\n'])
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
