import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { materialize, rules } from './rules.mjs'
import { scan } from './check.mjs'
import { renderReport } from './report.mjs'

test('catalog has 100 distinct mistakes', () => {
  const ids = rules.map((row) => row[0])
  assert.equal(ids.length, 100)
  assert.equal(new Set(ids).size, 100)
  for (const rule of rules.map(materialize)) {
    assert.ok(rule.title.length > 8)
    assert.ok(['error', 'warning', 'review'].includes(rule.severity))
    if (rule.pattern) new RegExp(rule.pattern, 'g')
  }
})

test('flags a planted secret and ignores a clean file', () => {
  const root = mkdtempSync(join(tmpdir(), 'vibe-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src/bad.js'), 'const key = "AKIAIOSFODNN7EXAMPLE"\n')
  writeFileSync(join(root, 'src/clean.js'), 'export const port = 4173\n')
  const findings = scan(root)
  assert.ok(findings.some((item) => item.id === 'V001'))
  assert.equal(findings.some((item) => item.file.endsWith('clean.js')), false)
})

test('one file can produce every matching check', () => {
  const root = mkdtempSync(join(tmpdir(), 'vibe-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src/bad.js'), 'eval("1")\ndocument.write("x")\n')
  const findings = scan(root)
  assert.ok(findings.some((item) => item.id === 'V011'))
  assert.ok(findings.some((item) => item.id === 'V015'))
  const report = renderReport(findings)
  assert.equal(report.rows.length, 100)
  assert.match(report.markdown, /^# Vibe check\n\nAll 100 checks ran/)
  assert.match(report.markdown, /## Summary\n\n\| Result \| Checks \|/)
  assert.equal(report.counts.Pass + report.counts.Suggestion + report.counts['Not automated'], 100)
})
