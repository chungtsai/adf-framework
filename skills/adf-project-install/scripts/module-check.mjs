#!/usr/bin/env node
// ADF Module 檢查工具：格式與 SQL／Secret（L-*）、manifest 結構（M-*）、連結與版控差異（R-*）檢查，以及覆蓋率與結案預檢。
// 規則依共用規範 core/module-format.md；只讀檔案、不修改任何 Artifact，也不判定核准。
// 用法：node module-check.mjs <module-dir> [--project <專案根目錄>] [--json] [--no-git] [--gate]
// exit code：0 沒有 ERROR；1 有 ERROR；2 工具無法執行（找不到 Module、manifest 超出 YAML 子集等）
// --gate（結案預檢）：0 READY；1 BLOCKED；3 HUMAN_REQUIRED；2 工具無法執行
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const FORMAT = 1;

// ---------- 識別碼（草案 2.1） ----------
const PREFIX_SRC = 'REV-Q|REQ|LB|BR|VAL|Q|UI|FS|TC|AC|DEV|MIG';
const ID_BODY = `(?:${PREFIX_SRC})(?:-[A-Z0-9]+)+`;
const ID_FULL = new RegExp(`^${ID_BODY}$`);
const idPattern = () => new RegExp(`(?<![A-Za-z0-9-])${ID_BODY}(?![A-Za-z0-9])`, 'g');
const RANGE = new RegExp(`${ID_BODY}\\s*[~～]\\s*${ID_BODY}`);
export const findIds = text => [...new Set(String(text ?? '').match(idPattern()) || [])];
export const prefixOf = id => id.startsWith('REV-Q-') ? 'REV-Q' : id.split('-')[0];
const MODULE_PREFIXES = ['REQ', 'LB', 'BR', 'VAL', 'Q', 'UI', 'FS', 'TC'];
const RULE_PREFIXES = ['BR', 'VAL', 'Q', 'UI', 'MIG'];

// ---------- 列舉（草案第 4 節） ----------
const ART_STATUS = ['DRAFT', 'APPROVED', 'VERIFIED', 'CONFIRMED', 'REVIEW_REQUIRED', 'UNKNOWN', 'CONFLICT', 'REMOVED'];
const OPEN_STATUS = ['REVIEW_REQUIRED', 'UNKNOWN', 'CONFLICT'];
const TRACE_RESULT = ['PASS', 'FAIL', 'NOT_RUN', 'BLOCKED'];
const COMPARE_CLASS = ['PASS', 'EQUIVALENT', 'MIGRATION_DEFECT', 'APPROVED_BEHAVIOR_CHANGE', 'SPEC_GAP', 'LEGACY_UNKNOWN', 'TEST_DATA_PROBLEM', 'REVIEW_REQUIRED'];
const AC_RESULT = ['待驗收', '通過', '不通過', '不適用'];
const LB_CATEGORY = ['輸入與驗證', '分支', '查詢', '交易', '副作用', '錯誤處理', '權限', '隱含行為'];
const RULE_SECTIONS = {'businessrules': 'BR', 'validationrules': 'VAL', 'queryrules': 'Q', 'uirules': 'UI', 'migrationrules': 'MIG'};
const DONE = ['done', 'passed'];
const BASELINE = 'approved baseline';
const NA = '不適用';

// ---------- SQL 安全（L-08） ----------
// 只認 SQL 語法（INSERT INTO、UPDATE x SET、DELETE FROM…），避免把說明文字裡的「DELETE」當成 SQL
const DML = /\b(INSERT\s+INTO|UPDATE\s+[\w."[\]]+\s+SET|DELETE\s+FROM|MERGE\s+INTO|TRUNCATE\s+TABLE|DROP\s+(?:TABLE|VIEW|INDEX|PROCEDURE|FUNCTION|SEQUENCE|TRIGGER)|ALTER\s+(?:TABLE|VIEW|INDEX|SEQUENCE)|CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|INDEX|PROCEDURE|FUNCTION|SEQUENCE|TRIGGER)|GRANT\s+\w+|REVOKE\s+\w+|EXEC(?:UTE)?\s+[\w.]+|CALL\s+[\w.]+\s*\(|FOR\s+UPDATE)\b/i;
export function sqlWrite(text) {
  const s = String(text ?? '').replace(/'(?:[^']|'')*'/g, "''").replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const m = DML.exec(s);
  return m ? m[1].replace(/\s+/g, ' ').toUpperCase().split(' ').slice(0, 2).join(' ') : null;
}
const CLEANUP = /cleanup|setup|清除|清理|還原測試資料|測試資料/i;
const HUMAN_CONFIRM = /人工確認|Human\s*確認|Human\s+confirm/i;

// ---------- Secret（L-09）：只回報類型與位置，不輸出內容 ----------
const SECRET_STRONG = [
  ['私密金鑰', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ['AWS Access Key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub Token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/],
  ['Slack Token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['API Key（sk-）', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];
const URL_CRED = /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@<>]+:([^\s@/<>]+)@/gi;
const SECRET_KEY = /(?<![A-Za-z])(password|passwd|pwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|token|密碼|金鑰)\s*[:=：]\s*["']?([^\s"'，。、|<>]+)/gi;
const PLACEHOLDER = v => v.length < 4 || /^(\*+|x+|\.{3}|…+|-+|—+|CHANGE_ME|null|none|請.*|略|空白)$/i.test(v) || /^[<${]/.test(v);
const TEXT_EXT = new Set(['.md', '.yaml', '.yml', '.json', '.sql', '.txt', '.csv', '.properties', '.xml', '.env']);
export function secretFindings(text) {
  const out = [];
  String(text ?? '').split(/\r?\n/).forEach((l, i) => {
    for (const [kind, re] of SECRET_STRONG) if (re.test(l)) out.push({line: i + 1, kind, strong: true});
    for (const m of l.matchAll(URL_CRED)) if (!PLACEHOLDER(m[1])) out.push({line: i + 1, kind: '連線字串內含帳號密碼', strong: true});
    for (const m of l.matchAll(SECRET_KEY)) if (!PLACEHOLDER(m[2])) out.push({line: i + 1, kind: `疑似${m[1]}`, strong: false});
  });
  return out;
}

// ---------- manifest 結構（M-*） ----------
const WORK_TYPES = ['NEW', 'CHANGE', 'MIGRATION'];
const INTENTS = ['FEATURE', 'BUGFIX', 'SECURITY_FIX', 'REFACTOR', 'PERFORMANCE', 'DOCUMENTATION', 'RETROFIT_VERIFY', 'BASELINE_ADOPTION'];
const ORIGINS = ['NEW', 'MIGRATION'];
const REVIEW_STATUS = ['IN_PROGRESS', 'QUESTIONS_PENDING', 'READY_FOR_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'];
const STAGE_STATUS = ['pending', 'done', 'passed', 'not_applicable'];
const ACCEPT_ONLY = ['in_review', 'failed'];
const PRE_55 = p => p === 'work_item.base_ref' || p.startsWith('work_item.changes') || p === 'status.verification.acceptance';
// 欄位清單以 owner Skill 的範本為唯一來源（repo 與安裝後的 Skill 目錄結構相同）
const TEMPLATE = fileURLToPath(new URL('../../adf-feature-init/assets/manifest.yaml', import.meta.url));
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const getPath = (o, p) => p.split('.').reduce((x, k) => (isObj(x) && k in x ? x[k] : undefined), o);
function leaves(o, prefix = '', out = []) {
  for (const [k, v] of Object.entries(o)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObj(v) && Object.keys(v).length) leaves(v, p, out); else out.push(p);
  }
  return out;
}

// ---------- git（M-09、R-05） ----------
function git(cwd, args) {
  try {
    const r = spawnSync('git', args, {cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    return r.status === 0 ? r.stdout : null;
  } catch { return null; }
}

// ---------- Markdown（草案 1.2） ----------
const norm = s => String(s ?? '').replace(/\s+/g, '').toLowerCase();
const blank = v => v === '' || v === '—' || v === '-';

function cells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n')
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]*)`/g, '$1').split('\n').map(x => x.trim()).join('\n').trim());
}

/** 所有表格：{section, line, head, rows:[{line, cells}]}；line 為 1 起算 */
export function tables(text) {
  const lines = String(text ?? '').split(/\r?\n/), out = [];
  let section = '', fence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^#{1,6}\s+(.*)$/.exec(lines[i]);
    if (h) { section = h[1].trim(); continue; }
    if (lines[i].trimStart().startsWith('|') && i + 1 < lines.length &&
        /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const t = {section, line: i + 1, head: cells(lines[i]), rows: []};
      i += 2;
      while (i < lines.length && lines[i].trimStart().startsWith('|')) { t.rows.push({line: i + 1, cells: cells(lines[i])}); i++; }
      i--;
      out.push(t);
    }
  }
  return out;
}

function colMap(head, spec) {
  const names = head.map(norm), shortNames = head.map(h => norm(String(h ?? '').replace(/[（(][^）)]*[）)]/g, '')));
  const pos = {};
  for (const [key, c] of Object.entries(spec)) {
    const want = c.names.map(norm);
    let i = names.findIndex((n, j) => want.includes(n) && !Object.values(pos).includes(j));
    if (i < 0) i = shortNames.findIndex((n, j) => want.includes(n) && !Object.values(pos).includes(j));
    if (i >= 0) pos[key] = i;
  }
  return pos;
}

// ---------- manifest.yaml（草案 6.1 的 YAML 子集） ----------
export class YamlError extends Error {}

function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

function splitTopLevel(str, delim = ',') {
  const out = [];
  let cur = '', q = null, depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) { cur += ch; if (ch === q && str[i - 1] !== '\\') q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '[' || ch === '{') { depth++; cur += ch; continue; }
    if (ch === ']' || ch === '}') { depth--; cur += ch; continue; }
    if (ch === delim && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur || out.length) out.push(cur);
  return out;
}

function scalar(v, line) {
  v = v.trim();
  if (/^['"]/.test(v)) {
    if (v.length < 2 || !v.endsWith(v[0])) throw new YamlError(`第 ${line} 行：引號沒有結束`);
    return v.slice(1, -1);
  }
  if (v.startsWith('[')) {
    if (!v.endsWith(']')) throw new YamlError(`第 ${line} 行：清單沒有結束`);
    const inner = v.slice(1, -1).trim();
    return inner ? splitTopLevel(inner, ',').map(x => scalar(x, line)) : [];
  }
  if (v.startsWith('{')) {
    if (!v.endsWith('}')) throw new YamlError(`第 ${line} 行：物件沒有結束`);
    const inner = v.slice(1, -1).trim(), obj = {};
    if (!inner) return obj;
    for (const part of splitTopLevel(inner, ',')) {
      if (!part.trim()) continue;
      const idx = part.indexOf(':');
      if (idx < 0) throw new YamlError(`第 ${line} 行：無法解析「${part.trim()}」`);
      const k = part.slice(0, idx).trim().replace(/^['"]|['"]$/g, '');
      const val = part.slice(idx + 1).trim();
      obj[k] = val ? scalar(val, line) : null;
    }
    return obj;
  }
  if (/^[|>&*!]/.test(v)) throw new YamlError(`第 ${line} 行：不支援的 YAML 寫法「${v[0]}」（只支援 2 空白縮排的欄位、清單、單行 {} 與區塊字串 |/>；不支援 anchor 與 tag）`);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

const BLOCK_SCALAR = /^([|>])([+-])?(\d+)?$/;

export function parseYaml(text) {
  const rawLines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/);
  const lines = [];
  rawLines.forEach((raw, i) => {
    if (/^\t| \t|^\s*\t/.test(raw)) throw new YamlError(`第 ${i + 1} 行：不可用 Tab 縮排`);
    const s = stripComment(raw).replace(/\s+$/, '');
    if (!s.trim()) return;
    if (/^(---|\.\.\.)\s*$/.test(s)) throw new YamlError(`第 ${i + 1} 行：不支援多文件（---）`);
    const indent = s.length - s.trimStart().length;
    if (indent % 2) throw new YamlError(`第 ${i + 1} 行：縮排必須是 2 個空白的倍數`);
    lines.push({indent, content: s.trim(), line: i + 1, raw});
  });
  if (!lines.length) return {};
  const isItem = c => c === '-' || c.startsWith('- ');
  function readBlockScalar(i, parentIndent, header) {
    const [, style, chomp] = BLOCK_SCALAR.exec(header);
    const parts = [];
    let baseIndent = null;
    while (i < lines.length && lines[i].indent > parentIndent) {
      if (baseIndent === null) baseIndent = lines[i].indent;
      parts.push(lines[i].raw.slice(baseIndent));
      i++;
    }
    const textVal = style === '>' ? parts.map(p => p.trim()).join(' ') : parts.join('\n');
    return [chomp === '-' ? textVal.replace(/\n+$/, '') : textVal, i];
  }
  function block(i, indent) {
    if (isItem(lines[i].content)) {
      const arr = [];
      while (i < lines.length && lines[i].indent === indent && isItem(lines[i].content)) {
        const {content, line} = lines[i];
        const v = content.slice(1).trim();
        if (!v) {
          i++;
          if (i < lines.length && lines[i].indent > indent) {
            const [val, next] = block(i, lines[i].indent);
            arr.push(val); i = next;
          } else arr.push(null);
          continue;
        }
        const kv = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(v);
        if (kv) {
          const obj = {}, key = kv[1];
          i++;
          if (kv[2] !== undefined && kv[2] !== '') {
            if (BLOCK_SCALAR.test(kv[2].trim())) [obj[key], i] = readBlockScalar(i, indent + 2, kv[2].trim());
            else obj[key] = scalar(kv[2], line);
          } else if (i < lines.length && lines[i].indent > indent + 2) [obj[key], i] = block(i, lines[i].indent);
          else obj[key] = null;
          if (i < lines.length && lines[i].indent === indent + 2 && !isItem(lines[i].content)) {
            const [rest, next] = block(i, indent + 2);
            for (const [k, val] of Object.entries(rest)) {
              if (k in obj) throw new YamlError(`第 ${line} 行：重複的欄位 ${k}`);
              obj[k] = val;
            }
            i = next;
          }
          arr.push(obj);
          continue;
        }
        arr.push(scalar(v, line)); i++;
      }
      return [arr, i];
    }
    const obj = {};
    while (i < lines.length && lines[i].indent === indent && !isItem(lines[i].content)) {
      const {content, line} = lines[i];
      const m = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(content);
      if (!m) throw new YamlError(`第 ${line} 行：無法解析「${content}」`);
      const key = m[1];
      if (key in obj) throw new YamlError(`第 ${line} 行：重複的欄位 ${key}`);
      i++;
      if (m[2] !== undefined && m[2] !== '') {
        if (BLOCK_SCALAR.test(m[2].trim())) [obj[key], i] = readBlockScalar(i, indent, m[2].trim());
        else obj[key] = scalar(m[2], line);
      } else if (i < lines.length && lines[i].indent > indent) [obj[key], i] = block(i, lines[i].indent);
      else if (i < lines.length && lines[i].indent === indent && isItem(lines[i].content)) [obj[key], i] = block(i, indent);
      else obj[key] = null;
    }
    if (i < lines.length && lines[i].indent > indent) throw new YamlError(`第 ${lines[i].line} 行：縮排不正確`);
    return [obj, i];
  }
  const [value, next] = block(0, lines[0].indent);
  if (next < lines.length) throw new YamlError(`第 ${lines[next].line} 行：縮排不正確`);
  return value;
}

// ---------- Artifact 表格規格（草案第 5 節） ----------
const C = (names, o = {}) => ({names, ...o});
const REF = (prefixes, o = {}) => ({ref: prefixes, ...o});
const STATUS = C(['Status', '狀態'], {req: true, enum: ART_STATUS});

const ARTIFACTS = [
  {file: 'spec/requirements.md', tables: [{
    name: 'Requirement',
    select: (p, t) => 'id' in p && t.rows.some(r => /^REQ-/.test(r.cells[p.id] || '')),
    define: {col: 'id', prefixes: ['REQ']},
    cols: {id: C(['ID', '編號', 'REQ']), name: C(['名稱', 'Title', 'Name', '需求', '標題', '說明', 'Description', '描述'], {req: true}), status: STATUS},
  }]},
  {file: 'spec/rules.md', tables: [{
    name: 'Rule',
    select: (p, t) => 'id' in p && ('expected' in p || ('rule' in p && t.rows.some(r => /^(?:BR|VAL|Q|UI|MIG)-/.test(r.cells[p.id] || '')))),
    define: {col: 'id', prefixes: RULE_PREFIXES, bySection: true},
    cols: {
      id: C(['ID', '編號']), rule: C(['規則', 'Rule', '名稱'], {req: true}),
      expected: C(['預期行為', 'Expected', 'Expected Behavior']),
      source: C(['Source', '來源'], {req: true, ...REF(['REQ', 'LB'], {baseline: true})}), status: STATUS,
    },
  }]},
  {file: 'spec/standards.md', tables: [{
    name: 'Standards 適用性',
    select: p => 'standard' in p && 'applies' in p,
    standards: true,
    cols: {
      standard: C(['Standard', '規範'], {req: true, ...REF(['DEV', 'MIG'], {single: true})}),
      id: C(['ID']),
      version: C(['版本', 'Version']),
      applies: C(['適用', 'Applicability'], {req: true, enum: ['適用', '不適用', 'CONFLICT', 'YES', 'NO', 'PARTIAL']}),
      reason: C(['理由', 'Reason']),
    },
  }]},
  {file: 'analysis/legacy-behavior.md', tables: [{
    name: 'Legacy 行為清單',
    select: p => 'id' in p && 'certainty' in p && 'risk' in p,
    define: {col: 'id', prefixes: ['LB']},
    cols: {
      id: C(['ID', '編號']), entry: C(['入口'], {req: true}), category: C(['類別'], {req: true, enum: LB_CATEGORY}),
      behavior: C(['行為'], {req: true}), evidence: C(['證據位置']),
      certainty: C(['確定度'], {req: true, enum: ['CONFIRMED', 'UNKNOWN']}), risk: C(['風險'], {req: true, enum: ['HIGH', 'NORMAL']}),
      rules: C(['規則'], REF(RULE_PREFIXES)), status: C(['Status', '狀態'], {enum: ['REMOVED']}),
    },
  }, {
    name: 'Legacy Finding',
    select: p => 'id' in p && 'standards' in p,
    cols: {id: C(['ID'], {req: true, ...REF(['LB'])}), standards: C(['對應規範'], REF(['DEV', 'MIG']))},
  }]},
  {file: 'verification/functional-scenarios.md', tables: [{
    name: 'Functional Scenario',
    select: p => 'id' in p && 'flow' in p,
    define: {col: 'id', prefixes: ['FS']},
    cols: {
      id: C(['ID', '編號']), source: C(['Source', '來源'], {req: true, ...REF(['REQ', ...RULE_PREFIXES], {baseline: true})}),
      flow: C(['User Flow', '操作步驟'], {req: true}), ui: C(['UI Expected'], {req: true}),
      data: C(['Data Verification', 'Verification SQL', 'Verification Method'], {sql: true}),
      tests: C(['Related Test'], {req: true, ...REF(['TC'])}), status: STATUS,
    },
  }]},
  {file: 'verification/test-cases.md', tables: [{
    name: 'Test Case',
    select: p => 'id' in p && 'expected' in p,
    define: {col: 'id', prefixes: ['TC']},
    cols: {
      id: C(['ID', '編號', 'TC']),
      source: C(['Source', '來源'], {req: true, emptyCode: 'R-03', ...REF(['REQ', ...RULE_PREFIXES, 'LB'], {baseline: true})}),
      scenario: C(['Scenario', '情境'], REF(['FS'])),
      expected: C(['Expected Result', '預期結果', 'Target Expected'], {req: true}),
      verification: C(['Verification', 'Verification SQL / Method', 'Verification SQL', 'Verification Method'], {sql: true}),
      status: STATUS,
    },
  }]},
  {file: 'verification/traceability.md', tables: [{
    name: 'Traceability',
    select: p => 'source' in p && 'test' in p,
    trace: true,
    cols: {
      source: C(['Source', '來源'], {req: true, ...REF(['REQ', 'LB', ...RULE_PREFIXES], {baseline: true, single: true})}),
      rule: C(['Rule', '規則'], REF(RULE_PREFIXES)), standard: C(['Standard', '規範'], REF(['DEV', 'MIG'])),
      fs: C(['Functional Scenario', 'Scenario', '情境'], REF(['FS'])),
      test: C(['Test', '測試'], {req: true, ...REF(['TC'], {single: true, na: true})}),
      result: C(['Result', '結果'], {req: true, enum: TRACE_RESULT}),
    },
  }]},
  {file: 'verification/comparison.md', tables: [{
    name: '差異清單',
    select: p => 'tc' in p && 'cls' in p,
    cols: {tc: C(['TC'], {req: true, ...REF(['TC'], {single: true})}), lb: C(['LB'], REF(['LB'])), cls: C(['分類'], {req: true, enum: COMPARE_CLASS})},
  }, {
    name: '未涵蓋的 Legacy 行為',
    select: p => 'lb' in p && 'risk' in p && !('tc' in p),
    cols: {lb: C(['LB'], {req: true, ...REF(['LB'], {single: true})}), risk: C(['風險'], {enum: ['HIGH', 'NORMAL']})},
  }]},
  {file: /^verification\/acceptance-.+\.md$/, tables: [{
    name: '驗收項目',
    select: p => 'id' in p && 'result' in p,
    define: {col: 'id', prefixes: ['AC'], fileScope: true},
    cols: {
      id: C(['AC ID']), type: C(['類型'], {req: true, enum: ['功能', '回歸']}),
      source: C(['來源 ID', '來源'], REF(MODULE_PREFIXES, {baseline: true})),
      tests: C(['對應測試與目前結果', '對應測試'], REF(['TC'], {freeText: true})),
      result: C(['結果'], {req: true, enum: AC_RESULT}), note: C(['備註']),
    },
  }]},
];

// ---------- 專案 standards/ ----------
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function walkAll(dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAll(p, out); else if (e.isFile()) out.push(p);
  }
  return out;
}

function checkManifest(m, add) {
  const F = 'manifest.yaml';
  // M-01：範本中的欄位
  if (fs.existsSync(TEMPLATE)) {
    const missing = leaves(parseYaml(fs.readFileSync(TEMPLATE, 'utf8'))).filter(p => getPath(m, p) === undefined);
    const old = missing.filter(PRE_55), other = missing.filter(p => !PRE_55(p));
    if (other.length) add('ERROR', 'M-01', F, null, null, `缺少欄位：${other.join('、')}`);
    if (old.length) add('INFO', 'M-01', F, null, null, `缺少 5.5.0 新增的欄位：${old.join('、')}（5.5.0 之前建立的 Work Item 照常進行）`);
  } else add('INFO', 'M-01', F, null, null, '找不到 adf-feature-init 的 manifest 範本，略過欄位完整性檢查');
  // M-02：CHANGE_ME
  const todo = [];
  const scan = (v, p) => { if (isObj(v)) for (const [k, x] of Object.entries(v)) scan(x, p ? `${p}.${k}` : k); else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${p}[${i}]`)); else if (v === 'CHANGE_ME') todo.push(p); };
  scan(m, '');
  if (todo.length) add('ERROR', 'M-02', F, null, null, `仍是 CHANGE_ME：${todo.join('、')}`);
  // M-03：Work Type、Intent、origin
  const wi = m.work_item || {}, type = wi.type, intents = wi.intents ?? [], origin = m.module?.origin;
  if (type !== undefined && !WORK_TYPES.includes(type)) add('ERROR', 'M-03', F, null, null, `work_item.type「${type}」不在允許值內：${WORK_TYPES.join('、')}`);
  if (!Array.isArray(intents)) add('ERROR', 'M-03', F, null, null, 'work_item.intents 必須是清單');
  else for (const x of intents) if (!INTENTS.includes(x)) add('ERROR', 'M-03', F, null, null, `work_item.intents 的「${x}」不在允許值內：${INTENTS.join('、')}`);
  if (origin !== undefined && !ORIGINS.includes(origin)) add('ERROR', 'M-03', F, null, null, `module.origin「${origin}」不在允許值內：${ORIGINS.join('、')}`);
  // M-04：既有系統導入情境（core/invariants.md Work Model 表）
  const list = Array.isArray(intents) ? intents : [];
  const scenario = (name, want) => {
    if (!list.includes(name)) return;
    const got = {'work_item.type': type, 'module.origin': origin, 'behavior.change_allowed': m.behavior?.change_allowed};
    for (const [k, v] of Object.entries(want)) if (got[k] !== v) add('ERROR', 'M-04', F, null, null, `${name} 的 ${k} 必須是 ${v}（目前：${got[k] ?? '（未填）'}）`);
    for (const k of ['backend', 'frontend']) {
      const v = m.status?.development?.[k];
      if (v !== undefined && v !== 'not_applicable') add('WARN', 'M-04', F, null, null, `${name} 只驗證、不修改 Target，status.development.${k} 應為 not_applicable（目前：${v}）`);
    }
  };
  if (list.includes('RETROFIT_VERIFY') && list.includes('BASELINE_ADOPTION')) add('ERROR', 'M-04', F, null, null, 'RETROFIT_VERIFY 與 BASELINE_ADOPTION 不可同時出現');
  scenario('RETROFIT_VERIFY', {'work_item.type': 'MIGRATION', 'module.origin': 'MIGRATION', 'behavior.change_allowed': false});
  scenario('BASELINE_ADOPTION', {'work_item.type': 'NEW', 'module.origin': 'NEW', 'behavior.change_allowed': false});
  if (list.includes('BASELINE_ADOPTION') && m.review?.approval?.required !== true) add('WARN', 'M-04', F, null, null, 'BASELINE_ADOPTION 必須 Human Approval，review.approval.required 應為 true');
  // M-05：狀態值
  const walkStatus = (v, p) => {
    if (isObj(v)) { for (const [k, x] of Object.entries(v)) if (!(k === 'reason' && 'status' in v)) walkStatus(x, `${p}.${k}`); return; }
    const isAccept = p === 'status.verification.acceptance';
    if (STAGE_STATUS.includes(v) || (isAccept && ACCEPT_ONLY.includes(v))) return;
    if (ACCEPT_ONLY.includes(v)) add('WARN', 'M-05', F, null, null, `${p} 的「${v}」只用於 status.verification.acceptance`);
    else add('ERROR', 'M-05', F, null, null, `${p} 的「${v}」不在允許值內：${STAGE_STATUS.join('、')}${isAccept ? `、${ACCEPT_ONLY.join('、')}` : ''}`);
  };
  if (isObj(m.status)) walkStatus(m.status, 'status');
  const rs = m.review?.status;
  if (rs !== undefined && !REVIEW_STATUS.includes(rs)) add('ERROR', 'M-05', F, null, null, `review.status「${rs}」不在允許值內：${REVIEW_STATUS.join('、')}`);
  // M-06：問題數
  const q = m.review?.questions;
  if (isObj(q) && [q.total, q.answered, q.unresolved].every(Number.isInteger) && q.total !== q.answered + q.unresolved)
    add('ERROR', 'M-06', F, null, null, `review.questions.total（${q.total}）應等於 answered（${q.answered}）+ unresolved（${q.unresolved}）`);
  // M-07：核准
  if (m.review?.approval?.approved === true && rs !== 'APPROVED') add('ERROR', 'M-07', F, null, null, `review.approval.approved 為 true 時，review.status 必須是 APPROVED（目前：${rs ?? '（未填）'}）`);
  if (rs === 'APPROVED' && Number.isInteger(q?.unresolved) && q.unresolved > 0) add('ERROR', 'M-07', F, null, null, `仍有 ${q.unresolved} 個未解決問題，review.status 不可為 APPROVED`);
}

function findProject(moduleDir) {
  let d = path.resolve(moduleDir);
  for (;;) {
    if (fs.existsSync(path.join(d, '.adf')) || fs.existsSync(path.join(d, 'standards'))) return d;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}

function loadStandards(root) {
  const dir = root && path.join(root, 'standards');
  if (!dir || !fs.existsSync(dir)) return null;
  const map = new Map();
  for (const f of walk(dir)) {
    const text = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!fm) continue;
    const get = k => (new RegExp(`^${k}:\\s*(.*?)\\s*$`, 'm').exec(fm[1]) || [])[1]?.replace(/^['"]|['"]$/g, '');
    const id = get('id');
    if (!id) continue;
    const subs = new Set(findIds(text.slice(fm[0].length)).filter(x => x.startsWith(`${id}-R`)));
    map.set(id, {status: get('status') || '', file: path.relative(root, f).split(path.sep).join('/'), subs});
  }
  return map;
}

// ---------- 主程式 ----------
export function checkModule(moduleDir, opts = {}) {
  const dir = path.resolve(moduleDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`找不到 Module 資料夾：${moduleDir}`);
  const findings = [];
  const add = (level, code, file, line, id, message) => findings.push({level, code, file, line: line ?? null, id: id ?? null, message});
  const read = rel => { const p = path.join(dir, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/^﻿/, '') : null; };

  // manifest
  let manifest = null;
  const mtext = read('manifest.yaml');
  if (mtext === null) add('ERROR', 'M-01', 'manifest.yaml', null, null, '找不到 manifest.yaml');
  else manifest = parseYaml(mtext); // YamlError 交給呼叫端（exit 2）
  if (manifest !== null && !isObj(manifest)) { add('ERROR', 'M-01', 'manifest.yaml', null, null, 'manifest.yaml 的最上層必須是欄位對應（mapping）'); manifest = null; }
  if (manifest && opts.manifest !== false) checkManifest(manifest, add);

  const files = [];
  const listDir = rel => { const p = path.join(dir, rel); return fs.existsSync(p) ? fs.readdirSync(p).map(f => `${rel}/${f}`) : []; };
  for (const a of ARTIFACTS) {
    const names = typeof a.file === 'string' ? [a.file] : listDir('verification').filter(f => a.file.test(f)).sort();
    for (const f of names) { const text = read(f); if (text !== null) files.push({file: f, text, spec: a}); }
  }

  const defs = new Map();          // id → {file, line, status, removed, row}
  const acDefs = new Map();        // file → Set(AC)
  const refs = [];                 // {file, line, from, removed, col, id, finalTrace}
  const rows = {TC: [], FS: [], RULE: [], TRACE: [], STD: []};
  const rowsBy = {};               // 表格名稱 → 列（覆蓋率用）

  // sig：內容摘要（不含 Status），供 R-05 與 base_ref 版本比對是否修改
  const define = (id, file, line, status, row, sig) => {
    const prev = defs.get(id);
    if (prev) { add('ERROR', 'L-04', file, line, id, `${id} 重複定義（第一次在 ${prev.file}:${prev.line}）`); return; }
    defs.set(id, {file, line, status, removed: status === 'REMOVED', row, sig});
  };
  const sigOf = (head, cells, skip) => head.map((h, i) => (i === skip ? null : `${norm(h)}=${cells[i].replace(/\s+/g, ' ')}`)).filter(Boolean).sort().join('\u0001');

  for (const {file, text, spec} of files) {
    const found = new Set();
    for (const t of tables(text)) {
      for (const ts of spec.tables) {
        const pos = colMap(t.head, ts.cols);
        if (!ts.select(pos, t)) continue;
        found.add(ts.name);
        const legacyRuleOrTc = (ts.name === 'Rule' && !('expected' in pos)) || (ts.name === 'Test Case' && !('status' in pos) && !('source' in pos));
        for (const [k, c] of Object.entries(ts.cols))
          if ((c.req || k === ts.define?.col) && !(k in pos) && !(legacyRuleOrTc && ['source', 'status'].includes(k))) add('ERROR', 'L-02', file, t.line, null, `「${ts.name}」表格缺少必要欄位「${c.names[0]}」`);
        const sectionPrefix = ts.define?.bySection ? RULE_SECTIONS[norm(t.section)] : null;
        for (const r of t.rows) {
          if (r.cells.length !== t.head.length) { add('ERROR', 'L-01', file, r.line, null, `欄數 ${r.cells.length} 與標題列 ${t.head.length} 不同（儲存格中的 | 要寫成 \\|）`); continue; }
          const v = k => (k in pos ? r.cells[pos[k]] : '');
          const status = v('status') || '';
          const removed = status === 'REMOVED';
          let rowId = null;
          if (ts.define) {
            rowId = v(ts.define.col);
            if (!ID_FULL.test(rowId)) { add('ERROR', 'L-03', file, r.line, rowId || null, `「${rowId || '（空白）'}」不是有效的識別碼`); continue; }
            const p = prefixOf(rowId);
            if (sectionPrefix && p !== sectionPrefix) add('ERROR', 'L-06', file, r.line, rowId, `${rowId} 位於「${t.section}」章節，前綴應為 ${sectionPrefix}`);
            else if (!ts.define.prefixes.includes(p)) add('ERROR', 'L-03', file, r.line, rowId, `${file} 不能定義 ${p} 前綴的識別碼`);
            if (ts.define.fileScope) {
              const set = acDefs.get(file) || new Set(); acDefs.set(file, set);
              if (set.has(rowId)) add('ERROR', 'L-04', file, r.line, rowId, `${rowId} 在本檔重複定義`); else set.add(rowId);
            } else define(rowId, file, r.line, status, {file, line: r.line}, sigOf(t.head, r.cells, pos.status));
          }
          const row = {id: rowId, file, line: r.line, status, removed, vals: {}};
          for (const [k, c] of Object.entries(ts.cols)) {
            if (!(k in pos) || k === ts.define?.col) continue;
            if (ts.standards && k === 'id') continue;
            const val = (ts.standards && k === 'standard' && !findIds(v(k)).length && 'id' in pos && findIds(v('id')).length) ? v('id') : v(k);
            if (blank(val)) {
              if (c.req) add(c.emptyCode === 'R-03' ? 'WARN' : 'ERROR', c.emptyCode || 'L-14', file, r.line, rowId, `「${c.names[0]}」不可空白`);
              row.vals[k] = [];
              continue;
            }
            if (c.enum) {
              const mainVal = String(val).split(/[（(；;]/)[0].trim();
              const ok = c.enum.includes(val) || c.enum.includes(mainVal);
              if (!ok) add('ERROR', 'L-05', file, r.line, rowId, `「${c.names[0]}」的值「${val}」不在允許值內：${c.enum.join('、')}`);
              row.vals[k] = c.enum.includes(val) ? val : mainVal;
              continue;
            }
            if (c.sql) {
              const w = sqlWrite(val);
              if (w) add('ERROR', 'L-08', file, r.line, rowId, `「${c.names[0]}」含有資料異動 SQL（${w}）；Verification SQL 只能用 SELECT，Cleanup SQL 須另外標示並由 Human 確認後執行`);
            }
            if (!c.ref) { row.vals[k] = val; continue; }
            if (RANGE.test(val)) add('ERROR', 'L-07', file, r.line, rowId, `「${c.names[0]}」不可寫範圍（${RANGE.exec(val)[0]}），請逐一列出`);
            const ids = findIds(val);
            const rest = val.replace(idPattern(), '').replace(/[、,，;；\s]+/g, ' ').trim();
            const restOk = !rest || (c.baseline && norm(rest) === norm(BASELINE)) || ((c.na || c.baseline) && rest === NA) || c.freeText;
            if (!restOk) add('WARN', 'L-11', file, r.line, rowId, `「${c.names[0]}」含有不是識別碼的文字「${rest}」`);
            if (!ids.length && c.req && !restOk) add('ERROR', 'L-14', file, r.line, rowId, `「${c.names[0]}」沒有任何識別碼`);
            if (c.single && ids.length > 1)
              add('WARN', 'L-10', file, r.line, rowId, `「${c.names[0]}」每列只能有一個識別碼（${ids.join('、')}）；舊寫法照常讀取，下次 CHANGE 修改 traceability 時拆成一列一個`);
            for (const id of ids) {
              const p = prefixOf(id);
              if (p === 'REV-Q') continue;
              if (!c.ref.includes(p)) { add('ERROR', 'L-12', file, r.line, rowId, `「${c.names[0]}」不能引用 ${p}（允許：${c.ref.join('、')}）`); continue; }
              refs.push({file, line: r.line, from: rowId, removed, col: c.names[0], id, trace: ts.trace, ac: ts.define?.fileScope});
            }
            row.vals[k] = ids;
          }
          (rowsBy[ts.name] ||= []).push(row);
          if (ts.define?.prefixes.includes('TC')) rows.TC.push(row);
          if (ts.define?.prefixes.includes('FS')) rows.FS.push(row);
          if (ts.define?.bySection) rows.RULE.push(row);
          if (ts.trace) rows.TRACE.push(row);
          if (ts.standards) rows.STD.push(row);
          if (ts.standards && ['不適用', 'CONFLICT'].includes(row.vals.applies) && blank(v('reason')))
            add('ERROR', 'L-14', file, r.line, null, `適用為「${row.vals.applies}」時「理由」不可空白`);
        }
      }
    }
    if (file === 'spec/rules.md') {
      const lines = text.split(/\r?\n/);
      let section = '', fence = false, headCount = 0;
      const ruleHeadRe = new RegExp(`^#{2,6}\\s+((?:${RULE_PREFIXES.join('|')})-[A-Z0-9]+(?:-[A-Z0-9]+)*)\\b(.*)$`);
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*(```|~~~)/.test(lines[i])) { fence = !fence; continue; }
        if (fence) continue;
        const m = ruleHeadRe.exec(lines[i]);
        if (!m) {
          const h = /^#{1,6}\s+(.*)$/.exec(lines[i]);
          if (h) section = h[1].trim();
          continue;
        }
        headCount++;
        const id = m[1], line = i + 1, p = prefixOf(id);
        const sectionPrefix = RULE_SECTIONS[norm(section)];
        if (sectionPrefix && p !== sectionPrefix) add('ERROR', 'L-06', file, line, id, `${id} 位於「${section}」章節，前綴應為 ${sectionPrefix}`);
        let status = '', srcIds = [];
        const body = [m[2].trim()];
        for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) {
          const ln = lines[j];
          const s = /^\s*[-*]?\s*\*{0,2}(?:status|狀態)\*{0,2}\s*[:：]\s*(\S+)/i.exec(ln);
          if (s) { if (!status) status = s[1].replace(/[`*]/g, ''); continue; }
          const src = /^\s*[-*]?\s*\*{0,2}(?:source|來源)\*{0,2}\s*[:：]\s*(.+)$/i.exec(ln);
          if (src) {
            for (const sid of findIds(src[1])) {
              const sp = prefixOf(sid);
              if (sp === 'REQ' || sp === 'LB') { srcIds.push(sid); refs.push({file, line: j + 1, from: id, removed: false, col: 'Source', id: sid}); }
            }
          }
          if (ln.trim()) body.push(ln.trim().replace(/\s+/g, ' '));
        }
        if (status && !ART_STATUS.includes(status)) add('ERROR', 'L-05', file, line, id, `Status「${status}」不在允許值內：${ART_STATUS.join('、')}`);
        const removed = status === 'REMOVED';
        define(id, file, line, status, {file, line}, body.join('\u0001'));
        const row = {id, file, line, status, removed, vals: {source: srcIds}};
        (rowsBy['Rule'] ||= []).push(row);
        rows.RULE.push(row);
      }
      if (headCount && found.has('Rule')) add('WARN', 'L-13', file, null, null, 'Rule 同時使用表格與標題兩種寫法');
    }
    if (file === 'spec/requirements.md') {
      const heads = [...text.matchAll(new RegExp(`^#{2,6}\\s+(REQ-[A-Z0-9]+(?:-[A-Z0-9]+)*)\\b(.*)$`, 'gm'))];
      const lines = text.split(/\r?\n/);
      for (const m of heads) {
        const line = text.slice(0, m.index).split('\n').length;
        let status = '';
        const body = [m[2].trim()];
        for (let i = line; i < lines.length && !/^#{1,6}\s/.test(lines[i]); i++) {
          const s = /^\s*[-*]?\s*(?:status|狀態)\s*[:：]\s*(\S+)/i.exec(lines[i]);
          if (s) { if (!status) status = s[1]; } else if (lines[i].trim()) body.push(lines[i].trim().replace(/\s+/g, ' '));
        }
        if (!status) add('ERROR', 'L-14', file, line, m[1], `${m[1]} 沒有「Status:」行`);
        else if (!ART_STATUS.includes(status)) add('ERROR', 'L-05', file, line, m[1], `Status「${status}」不在允許值內：${ART_STATUS.join('、')}`);
        define(m[1], file, line, status, {file, line}, body.join('\u0001'));
      }
      if (heads.length && found.has('Requirement')) add('WARN', 'L-13', file, null, null, 'Requirement 同時使用表格與標題兩種寫法');
    }
  }

  // L-08：verification 文件中的 SQL 程式碼區塊（Cleanup 區塊另外判斷）
  for (const {file, text} of files) {
    if (!/^verification\/(functional-scenarios|test-cases|acceptance-.+)\.md$/.test(file)) continue;
    const lines = text.split(/\r?\n/);
    let section = '';
    for (let i = 0; i < lines.length; i++) {
      const h = /^#{1,6}\s+(.*)$/.exec(lines[i]);
      if (h) { section = h[1]; continue; }
      const f = /^\s*(```|~~~)/.exec(lines[i]);
      if (!f) continue;
      const start = i, block = [];
      for (i++; i < lines.length && !lines[i].trimStart().startsWith(f[1]); i++) block.push(lines[i]);
      const w = sqlWrite(block.join('\n'));
      if (!w) continue;
      const before = lines.slice(Math.max(0, start - 3), start).join('\n');
      const context = [section, before, lines[start], block[0] || ''].join('\n');
      if (!CLEANUP.test(context)) add('ERROR', 'L-08', file, start + 1, null, `SQL 區塊含有資料異動（${w}）；Verification SQL 只能用 SELECT，Cleanup SQL 要在標題或區塊前註明「Cleanup」`);
      else if (!HUMAN_CONFIRM.test(context)) add('WARN', 'L-08', file, start + 1, null, `Cleanup SQL 含資料異動（${w}），須註明「人工確認後執行」`);
    }
  }

  // L-09：Module 內所有文字檔
  if (opts.secrets !== false) {
    for (const f of walkAll(dir)) {
      if (!TEXT_EXT.has(path.extname(f).toLowerCase()) || fs.statSync(f).size > 2 * 1024 * 1024) continue;
      const rel = path.relative(dir, f).split(path.sep).join('/');
      for (const s of secretFindings(fs.readFileSync(f, 'utf8')))
        add(s.strong ? 'ERROR' : 'WARN', 'L-09', rel, s.line, null, s.strong
          ? `疑似 ${s.kind}；Artifact 不可寫入 Secret（內容不顯示）`
          : `${s.kind}的值（內容不顯示）；請確認不是正式環境的帳密或金鑰，測試帳密建議改由測試環境設定提供`);
    }
  }

  // 專案 standards
  const project =opts.project ? path.resolve(opts.project) : findProject(dir);
  const standards = loadStandards(project);
  let stdSkipped = false;
  const stdLookup = id => {
    if (!standards) return undefined;
    if (standards.has(id)) return standards.get(id);
    const m = /^(.*)-R\d+$/.exec(id);
    const parent = m && standards.get(m[1]);
    return parent && parent.subs.has(id) ? parent : null;
  };

  // R-01／R-09：引用
  for (const r of refs) {
    const p = prefixOf(r.id);
    if (p === 'DEV' || p === 'MIG') {
      const s = stdLookup(r.id);
      if (s === undefined) { stdSkipped = true; continue; }
      if (!s) add('ERROR', 'R-01', r.file, r.line, r.from, `「${r.col}」引用的 ${r.id} 在專案 standards/ 中不存在`);
      continue;
    }
    const d = defs.get(r.id);
    if (!d) { add('ERROR', 'R-01', r.file, r.line, r.from, `「${r.col}」引用的 ${r.id} 不存在`); continue; }
    if (d.removed && !r.removed) add('ERROR', 'R-09', r.file, r.line, r.from, `「${r.col}」引用了已刪除（REMOVED）的 ${r.id}`);
  }
  // traceability：Result 已定案的歷史列不檢查 R-09（草案 R-09）
  for (const f of findings.filter(x => x.code === 'R-09' && x.file === 'verification/traceability.md')) {
    const row = rows.TRACE.find(t => t.line === f.line);
    if (row && ['PASS', 'FAIL'].includes(row.vals.result)) findings.splice(findings.indexOf(f), 1);
  }
  if (stdSkipped) add('INFO', 'R-06', null, null, null, '找不到專案 standards/，略過 DEV-*／MIG-* 的存在檢查（可用 --project 指定專案根目錄）');

  // R-06：Standards 適用性
  if (standards) for (const r of rows.STD) {
    if (r.vals.applies !== '適用') continue;
    for (const id of r.vals.standard || []) {
      const s = stdLookup(id);
      if (s && s.status !== 'APPROVED') add('ERROR', 'R-06', r.file, r.line, id, `${id} 的狀態是 ${s.status || '（空白）'}，適用的規範必須是 APPROVED（${s.file}）`);
    }
  }

  // R-02：TC.Scenario ↔ FS.Related Test
  const live = list => list.filter(r => r.id && !r.removed);
  const tcById = new Map(live(rows.TC).map(r => [r.id, r])), fsById = new Map(live(rows.FS).map(r => [r.id, r]));
  for (const tc of tcById.values()) for (const fs of tc.vals.scenario || []) {
    const f = fsById.get(fs);
    if (f && !(f.vals.tests || []).includes(tc.id)) add('ERROR', 'R-02', tc.file, tc.line, tc.id, `${tc.id} 的 Scenario 是 ${fs}，但 ${fs} 的 Related Test 沒有列出 ${tc.id}`);
  }
  for (const f of fsById.values()) for (const t of f.vals.tests || []) {
    const tc = tcById.get(t);
    if (tc && !(tc.vals.scenario || []).includes(f.id)) add('ERROR', 'R-02', f.file, f.line, f.id, `${f.id} 的 Related Test 有 ${t}，但 ${t} 的 Scenario 沒有填 ${f.id}`);
  }

  // R-03：孤兒（沒有任何有效 TC 驗證的 REQ 與 Rule）
  const covered = new Set();
  for (const tc of tcById.values()) for (const s of tc.vals.source || []) covered.add(s);
  for (const t of rows.TRACE) for (const tc of t.vals.test || []) if (tcById.has(tc)) for (const s of t.vals.source || []) covered.add(s);
  for (const rule of live(rows.RULE)) if (covered.has(rule.id)) for (const s of rule.vals.source || []) covered.add(s);
  for (const [id, d] of defs) {
    if (d.removed || !['REQ', ...RULE_PREFIXES].includes(prefixOf(id)) || covered.has(id)) continue;
    add('WARN', 'R-03', d.file, d.line, id, `${id} 沒有任何有效的 TC 驗證（直接引用、經 traceability 或經 Rule 皆無）`);
  }

  // R-07：狀態矛盾
  for (const tc of tcById.values()) {
    if (tc.status !== 'VERIFIED') continue;
    for (const s of tc.vals.source || []) {
      const d = defs.get(s);
      if (d && !['APPROVED', 'VERIFIED'].includes(d.status) && prefixOf(s) !== 'LB')
        add('ERROR', 'R-07', tc.file, tc.line, tc.id, `${tc.id} 已是 VERIFIED，但 Source ${s} 的狀態是 ${d.status || '（空白）'}`);
    }
  }
  const mst = manifest?.status || {};
  const st = mst.verification || {};
  const valOf = v => (isObj(v) ? v.status : v);
  const openIn = file => [...defs.entries()].filter(([, d]) => d.file === file && OPEN_STATUS.includes(d.status)).map(([id]) => id);
  const pairs = [
    ['status.analysis', valOf(mst.analysis), ['spec/requirements.md', 'spec/rules.md', 'analysis/legacy-behavior.md']],
    ['status.verification.test_generation', valOf(st.test_generation), ['verification/test-cases.md', 'verification/functional-scenarios.md']],
  ];
  for (const [key, val, fl] of pairs) {
    if (!DONE.includes(val)) continue;
    const open = fl.flatMap(openIn);
    if (open.length) add('WARN', 'R-07', 'manifest.yaml', null, null, `${key} 為 ${val}，但仍有未定案項目：${open.join('、')}`);
  }

  // R-04／M-08：本次變更紀錄
  const ch = manifest?.work_item?.changes;
  if (manifest && (ch === undefined || ch === null)) add('INFO', 'R-04', 'manifest.yaml', null, null, '沒有 work_item.changes（5.5.0 之前的 Work Item），略過變更紀錄檢查');
  else if (ch) {
    const seen = new Map();
    for (const kind of ['added', 'modified', 'removed']) {
      const list = ch[kind] ?? [];
      if (!Array.isArray(list)) { add('ERROR', 'M-03', 'manifest.yaml', null, null, `work_item.changes.${kind} 必須是清單`); continue; }
      for (const id of list.map(String)) {
        if (seen.has(id)) add('ERROR', 'M-08', 'manifest.yaml', null, id, `${id} 同時出現在 changes.${seen.get(id)} 與 changes.${kind}`);
        seen.set(id, kind);
        if (!ID_FULL.test(id) || !MODULE_PREFIXES.includes(prefixOf(id))) { add('ERROR', 'L-03', 'manifest.yaml', null, id, `changes.${kind} 的「${id}」不是 Module 識別碼`); continue; }
        const d = defs.get(id);
        if (kind === 'removed') {
          if (!d) add('ERROR', 'R-04', 'manifest.yaml', null, id, `changes.removed 的 ${id} 找不到定義（刪除時應保留該列並標 REMOVED）`);
          else if (!d.removed) add('ERROR', 'R-04', 'manifest.yaml', null, id, `changes.removed 的 ${id} 狀態不是 REMOVED（${d.file}:${d.line}）`);
        } else if (!d) add('ERROR', 'R-04', 'manifest.yaml', null, id, `changes.${kind} 的 ${id} 找不到定義`);
        else if (d.removed) add('ERROR', 'R-04', 'manifest.yaml', null, id, `changes.${kind} 的 ${id} 已標 REMOVED，應改列在 changes.removed`);
      }
    }
  }

  // M-09／R-05：版控
  if (manifest && opts.git !== false) gitChecks({dir, manifest, defs, add});

  // R-08：規格書（Read Model）
  const spec = read('specification.md');
  if (spec !== null) {
    const lines = spec.split(/\r?\n/);
    const reported = new Set();
    lines.forEach((l, i) => {
      for (const id of findIds(l)) {
        const p = prefixOf(id);
        if (!MODULE_PREFIXES.includes(p) || reported.has(id)) continue;
        const d = defs.get(id);
        if (!d) { reported.add(id); add('WARN', 'R-08', 'specification.md', i + 1, id, `規格書提到的 ${id} 不存在`); }
        else if (d.removed) { reported.add(id); add('WARN', 'R-08', 'specification.md', i + 1, id, `規格書提到的 ${id} 已標 REMOVED`); }
      }
    });
  }

  const order = {ERROR: 0, WARN: 1, INFO: 2};
  findings.sort((a, b) => String(a.file ?? '').localeCompare(String(b.file ?? '')) || (a.line ?? 0) - (b.line ?? 0) || order[a.level] - order[b.level]);
  const summary = {error: 0, warn: 0, info: 0};
  for (const f of findings) summary[f.level.toLowerCase()]++;
  const result = {
    tool: 'adf-module-check', format: FORMAT,
    module: project ? path.relative(project, dir).split(path.sep).join('/') || '.' : dir,
    work_item: manifest?.work_item?.id ?? null,
    summary, findings,
    coverage: computeCoverage({defs, rowsBy, manifest}),
  };
  if (opts.gate) result.gate = computeGate({manifest, defs, findings, coverage: result.coverage, read});
  Object.defineProperty(result, 'defs', {value: defs, enumerable: false}); // 供 R-05 讀 base_ref 版本用，不輸出
  return result;
}

// ---------- 結案預檢（gate-report） ----------
// 依 adf-development-complete 的各 Gate 與 core/invariants.md 彙整「能不能結案」。
// 工具只報告事實：結論為 READY 也只代表沒有找到阻擋項目，結案仍須 Human 在 Development Complete Gate 確認。
export const GATE_STATES = {PASS: '通過', BLOCKED: '阻擋', HUMAN: '待確認', NOT_APPLICABLE: '不適用'};

export function computeGate({manifest, defs, findings, coverage, read}) {
  const gates = [];
  const gate = (id, name, state, reasons = []) => gates.push({id, name, state, reasons: reasons.filter(Boolean)});
  const m = manifest || {};
  const wi = m.work_item || {};
  const intents = Array.isArray(wi.intents) ? wi.intents : [];
  const isMigration = wi.type === 'MIGRATION', isRetrofit = intents.includes('RETROFIT_VERIFY'), isBaseline = intents.includes('BASELINE_ADOPTION');
  const list = ids => ids.slice(0, 20).join('、') + (ids.length > 20 ? ` 等 ${ids.length} 項` : '');
  const done = v => DONE.includes(v);

  // G-01 檢查工具
  const errors = findings.filter(f => f.level === 'ERROR');
  const byCode = [...new Set(errors.map(f => f.code))];
  gate('G-01', '格式、manifest 與連結檢查', errors.length ? 'BLOCKED' : 'PASS',
    errors.length ? [`有 ${errors.length} 個錯誤（${byCode.join('、')}），請先修正`] : ['沒有錯誤']);

  // G-02 Review 與 Human Approval
  const rv = m.review || {}, q = rv.questions || {};
  const approvalRequired = rv.approval?.required === true || isBaseline;
  const g2 = [];
  if (Number.isInteger(q.unresolved) && q.unresolved > 0) g2.push(`仍有 ${q.unresolved} 個未解決問題`);
  if (Array.isArray(rv.blockers) && rv.blockers.length) g2.push(`review.blockers：${list(rv.blockers.map(String))}`);
  if (approvalRequired && !(rv.approval?.approved === true && rv.status === 'APPROVED'))
    g2.push(`${isBaseline ? 'BASELINE_ADOPTION 必須 Human Approval；' : ''}review 尚未核准（review.status：${rv.status ?? '（未填）'}）`);
  else if (!approvalRequired && rv.status && !['APPROVED', 'READY_FOR_REVIEW', 'IN_PROGRESS'].includes(rv.status)) g2.push(`review.status 為 ${rv.status}`);
  gate('G-02', 'Review 與 Human Approval', g2.length ? 'BLOCKED' : 'PASS', g2.length ? g2 : [approvalRequired ? '已核准' : '不需要另外的 Approval，且沒有未解決問題']);

  // G-03 Blockers
  const blockers = Array.isArray(m.blockers) ? m.blockers.map(b => (isObj(b) ? JSON.stringify(b) : String(b))) : [];
  gate('G-03', 'Blockers', blockers.length ? 'BLOCKED' : 'PASS', blockers.length
    ? [`manifest.blockers 有 ${blockers.length} 項：${list(blockers)}`, '若為驗收「有條件通過」且 Human 已明確核准例外、條件已寫入後續 Work Item，由 Human 判斷可否結案']
    : ['沒有 blockers']);

  // G-04 各 Stage 狀態（不含另外判斷的 acceptance）
  const pending = [], wrongNa = [];
  const walk = (v, p) => {
    if (isObj(v)) { for (const [k, x] of Object.entries(v)) if (!(k === 'reason' && 'status' in v)) walk(x, `${p}.${k}`); return; }
    if (p === 'status.verification.acceptance') return;
    if (!done(v) && v !== 'not_applicable') pending.push(`${p}（${v ?? '未填'}）`);
  };
  if (isObj(m.status)) walk(m.status, 'status');
  const must = [];
  if (isMigration) must.push('comparison');
  if (isRetrofit) must.push('legacy_baseline', 'normalization');
  for (const k of must) if (m.status?.verification?.[k] === 'not_applicable') wrongNa.push(`status.verification.${k}`);
  const g4 = [];
  if (pending.length) g4.push(`尚未完成：${list(pending)}`);
  if (wrongNa.length) g4.push(`${isRetrofit ? 'RETROFIT_VERIFY' : 'MIGRATION'} 不可標為 not_applicable：${wrongNa.join('、')}（MIGRATION 需通過 Semantic Comparison）`);
  gate('G-04', '各 Stage 狀態', g4.length ? 'BLOCKED' : 'PASS', g4.length ? g4 : ['全部為完成或不適用']);

  // G-05 未定案項目
  const open = [...defs].filter(([, d]) => OPEN_STATUS.includes(d.status)).map(([id, d]) => `${id}（${d.status}）`);
  gate('G-05', '未定案項目（REVIEW_REQUIRED／UNKNOWN／CONFLICT）', open.length ? 'BLOCKED' : 'PASS', open.length ? [list(open)] : ['沒有未定案項目']);

  // G-06 測試與執行結果
  const tcs = [...defs].filter(([id, d]) => prefixOf(id) === 'TC' && !d.removed);
  const unapprovedTc = tcs.filter(([, d]) => !GOOD_TC.includes(d.status)).map(([id]) => id);
  const e = coverage.execution;
  const g6 = [];
  if (!tcs.length) g6.push('沒有任何 Test Case');
  if (unapprovedTc.length) g6.push(`仍有未核准的測試：${list(unapprovedTc)}`);
  if (e.FAIL) g6.push(`FAIL：${list(e.failed)}`);
  if (e.NOT_RUN || e.BLOCKED) g6.push(`NOT_RUN ${e.NOT_RUN} 個、BLOCKED ${e.BLOCKED} 個`);
  if (e.UNCERTAIN) g6.push(`結果不明（traceability 一列多個 Test 的舊寫法）：${list(e.uncertain)}；可另開 DOCUMENTATION CHANGE，依可查證的執行紀錄拆成一列一個 Test，查無紀錄填 NOT_RUN`);
  if (e.NOT_RECORDED) g6.push(`traceability 沒有結果：${list(e.not_recorded)}`);
  gate('G-06', '測試與執行結果', g6.length ? 'BLOCKED' : 'PASS', g6.length ? g6 : [`已核准的 TC ${e.total} 個全部 PASS`]);

  // G-07 Traceability 覆蓋
  const g7 = [];
  const miss = (label, mt) => { if (mt && mt.total && mt.uncovered.length) g7.push(`${label}未涵蓋：${list(mt.uncovered)}`); };
  miss('Requirement ', coverage.requirement);
  for (const [p, mt] of Object.entries(coverage.rules)) miss(`Rule ${p} `, mt);
  miss('本次變更', coverage.changes);
  const anyDenominator = coverage.requirement.total || Object.values(coverage.rules).some(x => x.total);
  gate('G-07', 'Traceability（Source → Test）', g7.length ? 'BLOCKED' : anyDenominator ? 'PASS' : 'HUMAN',
    g7.length ? g7 : anyDenominator ? ['Requirement 與 Rule 都有已核准的測試'] : ['沒有任何 Requirement 或 Rule，請 Human 確認 Source（例如 Approved Baseline）']);

  // G-08 Legacy 行為與結果比對（MIGRATION／RETROFIT_VERIFY）
  if (isMigration || isRetrofit) {
    const l = coverage.legacy, cmp = read('verification/comparison.md');
    const g8 = [];
    let state = 'PASS';
    if (!l) { g8.push('沒有 analysis/legacy-behavior.md 的行為清單'); state = 'BLOCKED'; }
    if (cmp === null) { g8.push('沒有 verification/comparison.md'); state = 'BLOCKED'; }
    if (l && l.pass.uncovered.length) { g8.push(`比對未通過的 LB：${list(l.pass.uncovered)}`); state = 'BLOCKED'; }
    if (l && l.high_risk.uncovered.length) {
      g8.push(`未涵蓋的高風險 LB：${list(l.high_risk.uncovered)}；需 Human 決定並記錄在 comparison.md 的「Human 決策」`);
      if (state === 'PASS') state = 'HUMAN';
    }
    if (l && state === 'PASS') g8.push(`整體涵蓋 ${l.overall.covered}／${l.overall.total}（${pct(l.overall)}）、高風險 ${l.high_risk.covered}／${l.high_risk.total}（${pct(l.high_risk)}）、通過 ${l.pass.covered}／${l.pass.total}`);
    if (l && l.overall.uncovered.length && state !== 'BLOCKED') g8.push(`未涵蓋（非高風險）：${list(l.overall.uncovered.filter(x => !l.high_risk.uncovered.includes(x)))}`);
    gate('G-08', 'Legacy 行為與結果比對', state, g8);
  } else gate('G-08', 'Legacy 行為與結果比對', 'NOT_APPLICABLE', ['不是 MIGRATION／RETROFIT_VERIFY']);

  // G-09 Functional Scenario
  const fsTotal = coverage.scenario.total;
  if (!fsTotal) gate('G-09', 'Functional Scenario', 'HUMAN', ['沒有任何 FS；若 Module 有使用者操作流程應補建，沒有時請 Human 確認不適用']);
  else gate('G-09', 'Functional Scenario', coverage.scenario.uncovered.length ? 'BLOCKED' : 'PASS',
    coverage.scenario.uncovered.length ? [`沒有已核准測試的 FS：${list(coverage.scenario.uncovered)}`] : [`${fsTotal} 個 FS 都有已核准的測試`]);

  // G-10 Human-readable Specification
  const spec = read('specification.md');
  const r08 = findings.filter(f => f.code === 'R-08');
  if (spec === null) gate('G-10', '規格書（specification.md）', 'HUMAN', ['沒有 specification.md；有 Human-visible／Business Behavior 的 Module 應建立，純技術變更請 Human 確認不需要']);
  else gate('G-10', '規格書（specification.md）', r08.length ? 'BLOCKED' : 'PASS',
    r08.length ? [`規格書與正式 Artifact 不一致：${list(r08.map(f => f.id))}`] : ['引用的 ID 都存在；內容是否與本次核准的 Artifact 同步，由 Human 在結案時確認']);

  // G-11 驗收
  const acc = m.status?.verification?.acceptance;
  const accFile = wi.id ? `verification/acceptance-${wi.id}.md` : null;
  const accText = accFile ? read(accFile) : null;
  if (acc === undefined) gate('G-11', '驗收（Acceptance）', 'HUMAN', ['5.5.0 之前建立的 Work Item 沒有驗收狀態；可執行 adf-acceptance-checklist，由 Human 決定是否補做；未補做時不得宣稱已完成驗收']);
  else if (acc === 'not_applicable') gate('G-11', '驗收（Acceptance）', 'NOT_APPLICABLE', ['已標示不適用；只有 Human 可以這樣標示，理由需寫入 manifest']);
  else {
    const g11 = [];
    if (!done(acc)) g11.push(`status.verification.acceptance 為 ${acc}${acc === 'in_review' ? '（等待 Human 簽核）' : ''}`);
    if (accText === null) g11.push(`沒有 ${accFile ?? 'verification/acceptance-<work_item.id>.md'}`);
    else {
      const items = [], sign = [];
      for (const t of tables(accText)) {
        const pos = colMap(t.head, {id: C(['AC ID']), result: C(['結果']), conclusion: C(['結論']), signer: C(['驗收人'])});
        if ('id' in pos && 'result' in pos) for (const r of t.rows) { const v = r.cells[pos.result]; if (v !== '通過' && v !== '不適用') items.push(`${r.cells[pos.id]}（${v || '空白'}）`); }
        if ('conclusion' in pos) for (const r of t.rows) { const c = r.cells[pos.conclusion].replace(/[`／]/g, ' ').trim(); if (['通過', '有條件通過', '不通過'].includes(c)) sign.push(c); }
      }
      if (items.length) g11.push(`尚未通過的驗收項目：${list(items)}`);
      if (!sign.length) g11.push('簽核表沒有 Human 填寫的結論');
      else if (!sign.includes('通過') || sign.includes('不通過')) g11.push(`簽核結論：${sign.join('、')}`);
    }
    gate('G-11', '驗收（Acceptance）', g11.length ? 'BLOCKED' : 'PASS', g11.length ? g11 : ['已由 Human 簽核通過']);
  }

  // G-12 Standards 適用性衝突
  const std = read('spec/standards.md');
  const conflicts = [];
  if (std !== null) for (const t of tables(std)) {
    const pos = colMap(t.head, {standard: C(['Standard', 'ID', '規範']), applies: C(['適用', 'Applicability'])});
    if ('standard' in pos && 'applies' in pos) for (const r of t.rows) if (r.cells[pos.applies] === 'CONFLICT') conflicts.push(r.cells[pos.standard]);
  }
  gate('G-12', 'Standards 適用性', conflicts.length ? 'BLOCKED' : std === null ? 'HUMAN' : 'PASS',
    conflicts.length ? [`有衝突、尚待 Human 決定：${list(conflicts)}`] : std === null ? ['沒有 spec/standards.md，請 Human 確認本 Module 不適用任何專案規範'] : ['沒有衝突']);

  const count = s => gates.filter(g => g.state === s).length;
  const verdict = count('BLOCKED') ? 'BLOCKED' : count('HUMAN') ? 'HUMAN_REQUIRED' : 'READY';
  return {verdict, blocked: count('BLOCKED'), human: count('HUMAN'), gates};
}

const VERDICT = {
  BLOCKED: '阻擋：不得結案',
  HUMAN_REQUIRED: '待 Human 確認：工具沒有找到阻擋項目，但有需要 Human 判斷的 Gate',
  READY: '工具沒有找到阻擋項目',
};

export function formatGate(g) {
  const out = ['結案預檢（依 adf-development-complete 的各 Gate）'];
  for (const x of g.gates) {
    out.push(`  [${GATE_STATES[x.state]}] ${x.id} ${x.name}`);
    for (const r of x.reasons) out.push(`      - ${r}`);
  }
  out.push(`結論：${VERDICT[g.verdict]}${g.blocked ? `（阻擋 ${g.blocked} 項）` : ''}${g.human ? `（待確認 ${g.human} 項）` : ''}`);
  out.push('工具的結論不等於核准；結案仍須 Human 在 Development Complete Gate 確認。');
  return out.join('\n');
}

// ---------- 版控檢查 ----------
const KIND_LABEL = {added: '新增', modified: '修改', removed: '刪除'};

function gitChecks({dir, manifest, defs, add}) {
  const F = 'manifest.yaml';
  const wi = manifest.work_item || {};
  if (!('base_ref' in wi)) return; // 5.5.0 之前：M-01 已提示
  const top = git(dir, ['rev-parse', '--show-toplevel'])?.trim();
  if (!top) {
    // 沒有版控時 base_ref 本來就是 null，不必提示
    if (wi.base_ref !== null && wi.base_ref !== undefined) add('INFO', 'R-05', F, null, null, '不在 git 版控內（或沒有安裝 git），略過 base_ref 檢查（M-09）與實際差異比對（R-05）');
    return;
  }
  const rel = path.relative(fs.realpathSync(top), fs.realpathSync(dir)).split(path.sep).join('/');
  const relFile = f => (rel ? `${rel}/${f}` : f);

  // M-09：base_ref 和這個 Work Item 第一次記錄的值相同。
  // 例外：建立時沒有版控（null），之後導入 git 再補上 commit，允許一次 null → commit；補上之後同樣不得改寫，也不可改回 null。
  const empty = v => v === null || v === undefined || v === '';
  const commits = (git(top, ['log', '--format=%H', '--', relFile('manifest.yaml')]) || '').split('\n').filter(Boolean).reverse();
  let first = null;
  for (const c of commits) {
    let old;
    try { old = parseYaml(git(top, ['show', `${c}:${relFile('manifest.yaml')}`]) || ''); } catch { continue; }
    const ow = isObj(old) ? old.work_item : null;
    if (!isObj(ow) || ow.id !== wi.id || !('base_ref' in ow)) continue;
    if (!first) first = {commit: c, value: ow.base_ref};
    if (!empty(ow.base_ref)) { first = {commit: c, value: ow.base_ref}; break; }
  }
  if (first && !empty(first.value) && String(first.value) !== String(wi.base_ref ?? 'null'))
    add('ERROR', 'M-09', F, null, null, `work_item.base_ref 建立後不得改寫：第一次記錄（${first.commit.slice(0, 7)}）為 ${first.value}，目前為 ${wi.base_ref ?? 'null'}`);
  else if (first && empty(first.value) && !empty(wi.base_ref))
    add('INFO', 'M-09', F, null, null, `work_item.base_ref 建立時為 null（${first.commit.slice(0, 7)}），之後補上 ${String(wi.base_ref).slice(0, 12)}；導入版控後補一次是允許的，之後不得再改寫`);

  // R-05：changes 與 base_ref 起的實際差異
  const base = wi.base_ref;
  const ch = wi.changes;
  if (base === null || base === undefined || base === '') { add('INFO', 'R-05', F, null, null, 'work_item.base_ref 為 null（專案沒有版控基準），略過實際差異比對'); return; }
  if (git(top, ['cat-file', '-e', `${base}^{commit}`]) === null) { add('WARN', 'M-09', F, null, null, `找不到 base_ref 指向的 commit ${base}（可能是 shallow clone 或尚未 fetch），無法比對實際差異`); return; }
  if (!isObj(ch)) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adf-base-'));
  let baseDefs;
  try {
    const listed = (git(top, ['ls-tree', '-r', '--name-only', base, '--', rel || '.']) || '').split('\n').filter(Boolean);
    for (const f of listed) {
      if (!/\.(md|ya?ml)$/i.test(f)) continue;
      const content = git(top, ['show', `${base}:${f}`]);
      if (content === null) continue;
      const target = path.join(tmp, rel ? path.relative(rel, f) : f);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, content);
    }
    baseDefs = checkModule(tmp, {git: false, secrets: false, manifest: false, project: tmp}).defs;
  } catch (e) {
    add('WARN', 'R-05', F, null, null, `無法解析 base_ref（${String(base).slice(0, 12)}）時的 Module，略過實際差異比對：${e.message}`);
    return;
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }

  const actual = new Map();
  for (const [id, d] of defs) {
    if (!MODULE_PREFIXES.includes(prefixOf(id))) continue;
    const b = baseDefs.get(id);
    if (!b || b.removed) { if (!d.removed) actual.set(id, 'added'); }
    else if (d.removed) actual.set(id, 'removed');
    else if (b.sig !== d.sig) actual.set(id, 'modified');
  }
  for (const [id, b] of baseDefs) {
    if (!MODULE_PREFIXES.includes(prefixOf(id)) || b.removed || defs.has(id)) continue;
    actual.set(id, 'removed');
    add('WARN', 'R-05', b.file, null, id, `REVIEW_REQUIRED：${id} 在 base_ref 存在，但整列被刪除；刪除時應保留該列並標 REMOVED`);
  }
  const listed = new Map();
  for (const k of ['added', 'modified', 'removed']) for (const id of (Array.isArray(ch[k]) ? ch[k] : []).map(String)) if (!listed.has(id)) listed.set(id, k);
  const short = String(base).slice(0, 7);
  for (const [id, kind] of actual) {
    const got = listed.get(id);
    if (got === kind) continue;
    const d = defs.get(id) || baseDefs.get(id);
    const hint = kind === 'modified' && !got ? '（只改錯字或格式、行為不變時可不登記，請 Human 確認）' : '';
    add('WARN', 'R-05', d.file, d.line, id, got
      ? `REVIEW_REQUIRED：${id} 登記在 changes.${got}，但與 base_ref（${short}）相比實際為${KIND_LABEL[kind]}`
      : `REVIEW_REQUIRED：${id} 與 base_ref（${short}）相比為${KIND_LABEL[kind]}，但 changes.${kind} 沒有登記${hint}`);
  }
  for (const [id, kind] of listed) {
    if (actual.has(id) || !MODULE_PREFIXES.includes(prefixOf(id))) continue;
    add('WARN', 'R-05', F, null, id, `REVIEW_REQUIRED：changes.${kind} 登記了 ${id}，但與 base_ref（${short}）相比沒有對應差異`);
  }
}

// ---------- 覆蓋率（草案第 8 節） ----------
const GOOD_TC = ['APPROVED', 'VERIFIED'];
const FINAL_CLASS = c => !['TEST_DATA_PROBLEM', 'REVIEW_REQUIRED'].includes(c);
const PASS_CLASS = ['PASS', 'APPROVED_BEHAVIOR_CHANGE'];

function metric(ids, isCovered, isDraftOnly = () => false) {
  const uncovered = [], draft_only = [];
  let covered = 0;
  for (const id of ids) {
    if (isCovered(id)) covered++;
    else { uncovered.push(id); if (isDraftOnly(id)) draft_only.push(id); }
  }
  return {covered, total: ids.length, ratio: ids.length ? covered / ids.length : null, uncovered, draft_only};
}

export function computeCoverage({defs, rowsBy, manifest}) {
  const get = name => rowsBy[name] || [];
  const live = prefixes => [...defs].filter(([id, d]) => !d.removed && prefixes.includes(prefixOf(id))).map(([id]) => id);
  const tcStatus = new Map(get('Test Case').filter(r => r.id && !r.removed).map(r => [r.id, r.status]));

  // 每個 REQ／Rule／FS 連到的有效 TC（含 DRAFT 等未核准者，供「只有未核准測試」使用）
  const tests = new Map();
  const link = (id, tc) => { if (tcStatus.has(tc)) (tests.get(id) || tests.set(id, new Set()).get(id)).add(tc); };
  for (const tc of get('Test Case')) if (tc.id && !tc.removed) {
    for (const s of tc.vals.source || []) link(s, tc.id);
    for (const f of tc.vals.scenario || []) link(f, tc.id);
  }
  for (const t of get('Traceability')) for (const tc of t.vals.test || [])
    for (const s of [...(t.vals.source || []), ...(t.vals.rule || []), ...(t.vals.fs || [])]) link(s, tc);
  for (const f of get('Functional Scenario')) if (f.id && !f.removed) for (const tc of f.vals.tests || []) link(f.id, tc);
  for (const r of get('Rule')) if (r.id && !r.removed) for (const s of r.vals.source || []) for (const tc of tests.get(r.id) || []) link(s, tc);

  const covered = id => [...(tests.get(id) || [])].some(tc => GOOD_TC.includes(tcStatus.get(tc)));
  const draftOnly = id => (tests.get(id)?.size || 0) > 0 && !covered(id);
  const out = {
    requirement: metric(live(['REQ']), covered, draftOnly),
    rules: Object.fromEntries(RULE_PREFIXES.map(p => [p, metric(live([p]), covered, draftOnly)])),
    scenario: metric(live(['FS']), covered, draftOnly),
  };

  // 本次變更
  const ch = manifest?.work_item?.changes;
  const changed = ch ? [...new Set([...(ch.added || []), ...(ch.modified || [])].map(String))].filter(id => ['REQ', ...RULE_PREFIXES, 'FS'].includes(prefixOf(id))) : null;
  out.changes = changed ? metric(changed, covered, draftOnly) : null;

  // Legacy 行為（沿用 adf-result-comparison 步驟 5）
  const lbRows = get('Legacy 行為清單').filter(r => r.id && !r.removed);
  if (lbRows.length || defs.size && [...defs.keys()].some(id => prefixOf(id) === 'LB')) {
    const cmp = get('差異清單');
    const classes = new Map();
    for (const r of cmp) for (const tc of r.vals.tc || []) (classes.get(tc) || classes.set(tc, []).get(tc)).push(r.vals.cls);
    const finalTc = tc => (classes.get(tc) || []).length > 0 && classes.get(tc).every(FINAL_CLASS);
    const lbTests = new Map(lbRows.map(r => [r.id, new Set()]));
    for (const tc of get('Test Case')) if (tc.id && !tc.removed) for (const s of tc.vals.source || []) lbTests.get(s)?.add(tc.id);
    for (const r of cmp) for (const lb of r.vals.lb || []) for (const tc of r.vals.tc || []) lbTests.get(lb)?.add(tc);
    const compared = id => [...lbTests.get(id)].some(finalTc);
    const passed = id => compared(id) && [...lbTests.get(id)].filter(finalTc).every(tc => classes.get(tc).every(c => PASS_CLASS.includes(c)));
    const ids = lbRows.map(r => r.id), high = lbRows.filter(r => r.vals.risk === 'HIGH').map(r => r.id);
    const overall = metric(ids, compared), comparedIds = ids.filter(compared);
    out.legacy = {
      overall, high_risk: metric(high, compared),
      pass: metric(comparedIds, passed),
      unknown: lbRows.filter(r => r.vals.certainty === 'UNKNOWN').length,
    };
  } else out.legacy = null;

  // 驗收（目前 Work Item 的驗收清單）
  const wi = manifest?.work_item?.id;
  const acRows = get('驗收項目').filter(r => r.file === `verification/acceptance-${wi}.md`);
  if (!changed) out.acceptance = null;
  else if (!acRows.length) out.acceptance = {...metric(changed, () => false), note: `沒有 verification/acceptance-${wi ?? '<work_item.id>'}.md`};
  else {
    const acSources = new Set(acRows.filter(r => r.vals.type === '功能').flatMap(r => r.vals.source || []));
    out.acceptance = metric(changed, id => acSources.has(id));
  }

  // 執行結果（traceability，每個 TC 取最後一次結果；一列多 Test 的舊寫法依草案 9.1）
  const result = new Map();
  for (const t of get('Traceability')) {
    const list = (t.vals.test || []).filter(tc => tcStatus.has(tc));
    const r = typeof t.vals.result === 'string' ? t.vals.result : null;
    for (const tc of list) result.set(tc, !r ? 'UNCERTAIN' : list.length > 1 && r !== 'PASS' ? 'UNCERTAIN' : r);
  }
  const exec = {PASS: 0, FAIL: 0, NOT_RUN: 0, BLOCKED: 0, UNCERTAIN: 0, NOT_RECORDED: 0, failed: [], uncertain: [], not_recorded: []};
  for (const [tc, status] of tcStatus) {
    if (!GOOD_TC.includes(status)) continue;
    const r = result.get(tc);
    if (!r) { exec.NOT_RECORDED++; exec.not_recorded.push(tc); continue; }
    exec[r] = (exec[r] || 0) + 1;
    if (r === 'FAIL') exec.failed.push(tc);
    if (r === 'UNCERTAIN') exec.uncertain.push(tc);
  }
  exec.total = [...tcStatus.values()].filter(s => GOOD_TC.includes(s)).length;
  out.execution = exec;
  return out;
}

const pct = m => m.ratio === null ? '不適用' : `${Math.floor(m.ratio * 100)}%`;
function fmtMetric(label, m, unit = '') {
  if (!m) return `  ${label}：不適用`;
  let s = `  ${label}：${m.covered}／${m.total}${unit}（${pct(m)}）`;
  if (m.uncovered.length) s += `；未涵蓋：${m.uncovered.join('、')}`;
  if (m.draft_only?.length) s += `；其中只有未核准測試：${m.draft_only.join('、')}`;
  if (m.note) s += `；${m.note}`;
  return s;
}

export function formatCoverage(c) {
  const out = ['覆蓋率（涵蓋只代表至少有一個已核准的測試案例，不代表所有分支與資料組合都測過）'];
  out.push(fmtMetric('Requirement', c.requirement));
  for (const [p, m] of Object.entries(c.rules)) if (m.total) out.push(fmtMetric(`Rule ${p}`, m));
  out.push(fmtMetric('Functional Scenario', c.scenario));
  out.push(c.changes ? fmtMetric('本次變更（REQ／Rule／FS）', c.changes) : '  本次變更：不適用（manifest 沒有 work_item.changes）');
  if (c.legacy) {
    out.push(fmtMetric('Legacy 行為整體', c.legacy.overall) + `；確定度 UNKNOWN ${c.legacy.unknown} 項`);
    out.push(fmtMetric('Legacy 高風險', c.legacy.high_risk));
    out.push(fmtMetric('Legacy 通過率（通過 ÷ 已比對）', c.legacy.pass));
  }
  out.push(c.acceptance ? fmtMetric('驗收（本次變更有功能類 AC）', c.acceptance) : '  驗收：不適用（manifest 沒有 work_item.changes）');
  const e = c.execution;
  const tail = [e.failed.length && `失敗：${e.failed.join('、')}`, e.uncertain.length && `結果不明：${e.uncertain.join('、')}`, e.not_recorded.length && `未記錄：${e.not_recorded.join('、')}`].filter(Boolean);
  out.push(`  執行（已核准的 TC ${e.total} 個）：PASS ${e.PASS}、FAIL ${e.FAIL}、NOT_RUN ${e.NOT_RUN}、BLOCKED ${e.BLOCKED}、結果不明 ${e.UNCERTAIN}、未記錄 ${e.NOT_RECORDED}${tail.length ? `；${tail.join('；')}` : ''}`);
  return out.join('\n');
}

export function formatText(result) {
  const out = [`ADF Module 檢查：${result.module}${result.work_item ? `（${result.work_item}）` : ''}`];
  const label = {ERROR: '錯誤', WARN: '警告', INFO: '資訊'};
  for (const f of result.findings) {
    const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '（Module）';
    out.push(`  [${label[f.level]}] ${f.code} ${where}  ${f.message}`);
  }
  const s = result.summary;
  out.push(`結果：錯誤 ${s.error}、警告 ${s.warn}、資訊 ${s.info}`);
  if (result.coverage) out.push('', formatCoverage(result.coverage));
  if (result.gate) out.push('', formatGate(result.gate));
  return out.join('\n');
}

const isMain = () => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (process.argv[1] && isMain()) {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json'), noGit = argv.includes('--no-git'), gate = argv.includes('--gate');
  const pi = argv.indexOf('--project');
  const project = pi >= 0 ? argv[pi + 1] : undefined;
  const target = argv.filter((a, i) => !a.startsWith('--') && (pi < 0 || i !== pi + 1))[0];
  if (!target) { console.error('用法：node module-check.mjs <module-dir> [--project <專案根目錄>] [--json] [--no-git] [--gate]'); process.exit(2); }
  try {
    const result = checkModule(target, {project, git: !noGit, gate});
    console.log(json ? JSON.stringify(result, null, 2) : formatText(result));
    if (gate) process.exit({READY: 0, BLOCKED: 1, HUMAN_REQUIRED: 3}[result.gate.verdict]);
    process.exit(result.summary.error ? 1 : 0);
  } catch (e) {
    const message = e instanceof YamlError ? `manifest.yaml 超出支援的 YAML 範圍：${e.message}` : e.message;
    if (json) console.log(JSON.stringify({tool: 'adf-module-check', format: FORMAT, fatal: message}, null, 2));
    else console.error(`無法執行：${message}`);
    process.exit(2);
  }
}
