import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFixes, linesInPatch, partition, suggestionFor } from './suggest.mjs'

test('patch lines are the added lines', () => {
  const patch = ['@@ -1,2 +1,3 @@', ' same', '+added', '-gone', ' tail'].join('\n')
  const lines = linesInPatch(patch)
  assert.equal(lines.has(2), true)
  assert.equal(lines.has(3), false)
})

test('findings outside the diff become general comments', () => {
  const findings = [
    { id: 'V063', file: 'src/a.js', line: 2, severity: 'error', title: 'debugger' },
    { id: 'V081', file: 'src/app.jsx', line: 1, severity: 'warning', title: 'long' },
  ]
  const groups = partition(findings, new Map([['src/a.js', new Set([2])]]))
  assert.equal(groups.inline.length, 1)
  assert.equal(groups.general[0].id, 'V081')
})

test('debugger line is the only automatic edit', () => {
  const finding = { id: 'V063', file: 'src/a.js', line: 2, severity: 'error', title: 'debugger' }
  assert.equal(suggestionFor(finding, '  debugger'), '')
  const applied = applyFixes([
    { file: 'src/a.js', text: 'const a = 1\n  debugger\nconst b = 2\n', findings: [finding] },
  ])
  assert.equal(applied[0].text, 'const a = 1\nconst b = 2\n')
  assert.equal(applyFixes([{ file: 'src/a.js', text: 'debuggerish()\n', findings: [finding] }]).length, 0)
})
