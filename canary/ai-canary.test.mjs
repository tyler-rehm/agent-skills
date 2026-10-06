import assert from 'node:assert/strict'
import test from 'node:test'
import { CANARY_LINES, confesses, hasCanary, reasons } from './ai-canary.mjs'

test('canary matches only the leading marker', () => {
  assert.equal(hasCanary(`${CANARY_LINES.join('\n')}\n\n# Title`), true)
  assert.equal(hasCanary(`# Title\n${CANARY_LINES.join('\n')}`), false)
  assert.equal(confesses('- [ ] This was submitted by an AI agent and no human reviewed it'), false)
  assert.equal(confesses('- [x] This was submitted by an AI agent and no human reviewed it'), true)
  assert.equal(reasons('', '- [x] This was submitted by an AI agent and no human reviewed it').length, 1)
  assert.equal(reasons('# Readme', '## Summary').length, 0)
})
