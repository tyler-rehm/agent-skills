#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { materialize, rules as rawRules } from './rules.mjs'
import { extraFindings } from './project.mjs'
import { renderReport } from './report.mjs'
import { fileInScope, hasPathSegment, isAssign, isCode, isCommentLine, isConfigText, isGenerated, isGo, isHtmlish, isJs, isPy, isRb, isSourceConfig, isSql, isTestPath, isTs, isWeb, ruleScope } from './files.mjs'

const rules = rawRules.map(materialize)
const TEXT = new Set(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'go', 'rb', 'php', 'java', 'rs', 'vue', 'svelte', 'css', 'html', 'yml', 'yaml', 'sh', 'toml', 'env', 'sql', 'prisma', 'json'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'fixtures', '.git', 'playwright-report', 'test-results'])
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? null : process.argv[index + 1]
}

const PLACEHOLDER = /^(password|changeme|example|placeholder|development|secret|test|todo|your-password|admin|admin123|123456)$/i
const COMMENT_SKIP = new Set(['V007', 'V008', 'V019', 'V022', 'V023', 'V027', 'V063', 'V065', 'V092', 'V097'])
const FIXTURE_SEGMENTS = new Set(['fixture', 'fixtures'])

export function inspect(root) {
  const files = listFiles(root)
  const findings = []
  const texts = []
  for (const file of files) {
    const rel = relative(root, file)
    if (SKIP_FILES.has(rel.split('/').pop())) continue
    if (rel === 'checks/vibe' || rel.startsWith('checks/vibe/')) continue
    const text = readFileSync(file, 'utf8')
    texts.push({ rel, text })
    for (const rule of rules) {
      const scope = ruleScope(rule)
      if (scope !== 'any' && !fileInScope(scope, rel)) continue
      if (rule.kind === 'regex') matchLines(findings, rule, rel, text)
      else if (rule.kind === 'long-file') longFile(findings, rule, rel, text)
      else if (rule.kind === 'tracked-env') trackedEnv(findings, rule, rel)
    }
  }
  const scopes = collectScopes(root, texts)
  findings.push(...extraFindings(root, texts, rules))
  return { findings, scopes }
}

export function scan(root) {
  return inspect(root).findings
}

function matchLines(findings, rule, rel, text) {
  if (rule.id === 'V079') {
    if (!isTestPath(rel)) return
  } else if (isTestPath(rel) && rule.id !== 'V071' && rule.id !== 'V072') return
  if ((rule.id === 'V027' || rule.id === 'V082') && hasPathSegment(rel, FIXTURE_SEGMENTS)) return
  if ((rule.id === 'V064' || rule.id === 'V065' || rule.id === 'V082') && isGenerated(rel)) return
  const re = new RegExp(rule.pattern, 'g')
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    if (COMMENT_SKIP.has(rule.id) && isCommentLine(lines[i], rel)) continue
    if (re.test(lines[i]) && !placeholder(rule, lines[i])) findings.push(hit(rule, rel, i + 1))
    re.lastIndex = 0
  }
}

function placeholder(rule, line) {
  if (rule.id !== 'V007') return false
  const match = line.match(/['"]([^'"]+)['"]/)
  return Boolean(match && PLACEHOLDER.test(match[1]))
}

function longFile(findings, rule, rel, text) {
  if (!isCode(rel) || isTestPath(rel) || isGenerated(rel)) return
  const count = text.split(/\r?\n/).length
  if (count > 800) findings.push(hit(rule, rel, 1, `${count} lines`))
}

function trackedEnv(findings, rule, rel) {
  if (/\.(example|sample|template)$/.test(rel) || rel.includes('.example.')) return
  if (/(^|\/)\.env$/.test(rel) || /(^|\/)\.env\.[^/]+$/.test(rel)) findings.push(hit(rule, rel, 1))
}

function collectScopes(root, texts) {
  const scopes = {
    js: false,
    py: false,
    go: false,
    rb: false,
    html: false,
    web: false,
    ts: false,
    code: false,
    assign: false,
    sql: false,
    tests: false,
    workflow: false,
    e2e: false,
    manifest: false,
    engines: false,
    config: false,
    sourceConfig: false,
  }
  for (const { rel } of texts) {
    if (isTestPath(rel)) scopes.tests = true
    if (isJs(rel)) scopes.js = true
    if (isPy(rel)) scopes.py = true
    if (isGo(rel)) scopes.go = true
    if (isRb(rel)) scopes.rb = true
    if (isConfigText(rel)) scopes.config = true
    if (isSourceConfig(rel)) scopes.sourceConfig = true
    if (isTs(rel)) scopes.ts = true
    if (isHtmlish(rel)) scopes.html = true
    if (isWeb(rel)) scopes.web = true
    if (isCode(rel)) scopes.code = true
    if (isAssign(rel)) scopes.assign = true
    if (isSql(rel)) scopes.sql = true
    if (rel.startsWith('.github/workflows/') && /\.ya?ml$/.test(rel)) scopes.workflow = true
    if (/(^|\/)(playwright|cypress)\.config\.[cm]?[jt]s$/.test(rel)) scopes.e2e = true
  }
  const packagePath = join(root, 'package.json')
  if (existsSync(packagePath)) {
    scopes.manifest = true
    try {
      const json = JSON.parse(readFileSync(packagePath, 'utf8'))
      if (json.engines?.node) scopes.engines = true
    } catch {
      scopes.engines = false
    }
  }
  return scopes
}

function hit(rule, file, line, extra) {
  return { id: rule.id, severity: rule.severity, title: rule.title, file, line, extra: extra ?? '' }
}

function listFiles(root) {
  if (inGit(root)) {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    return out
      .split('\0')
      .filter(Boolean)
      .map((rel) => join(root, rel))
      .filter((file) => wanted(file))
  }
  const found = []
  walk(root, root, found)
  return found
}

function inGit(root) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function walk(root, dir, found) {
  for (const name of readdirSync(dir)) {
    if (dir === root && SKIP_DIRS.has(name)) continue
    if (name === 'node_modules' || name === '.git') continue
    const file = join(dir, name)
    const stat = statSync(file)
    if (stat.isDirectory()) walk(root, file, found)
    else if (wanted(file)) found.push(file)
  }
}

function wanted(file) {
  if (file.endsWith('.env')) return true
  const ext = file.split('.').pop()?.toLowerCase()
  return TEXT.has(ext)
}

export function summarize(findings) {
  const errors = findings.filter((item) => item.severity === 'error')
  const warnings = findings.filter((item) => item.severity === 'warning')
  const byCategory = new Map()
  for (const rule of rules) {
    if (!byCategory.has(rule.category)) byCategory.set(rule.category, [])
    byCategory.get(rule.category).push(rule)
  }
  const lines = [
    `# Vibe check`,
    ``,
    `${rules.length} checks. ${errors.length} errors, ${warnings.length} warnings.`,
    ``,
  ]
  if (findings.length) {
    lines.push(`## Findings`, ``)
    for (const item of findings) {
      const where = item.extra ? `${item.file}:${item.line} (${item.extra})` : `${item.file}:${item.line}`
      lines.push(`- ${item.severity} ${item.id} ${item.title} — ${where}`)
    }
    lines.push(``)
  }
  lines.push(`## Catalog`, ``)
  for (const [category, group] of byCategory) {
    lines.push(`### ${category}`, ``)
    for (const rule of group) lines.push(`- ${rule.id} ${rule.title} (${rule.severity})`)
    lines.push(``)
  }
  return lines.join('\n')
}

function main() {
  const root = argValue('--root') ?? process.argv.find((arg) => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]) ?? process.cwd()
  const failOn = argValue('--fail-on') ?? 'none'
  const { findings, scopes } = inspect(root)
  const report = renderReport(findings, scopes)
  const reportPath = argValue('--report')
  if (reportPath) writeFileSync(reportPath, report.markdown)
  const jsonPath = argValue('--json')
  if (jsonPath) writeFileSync(jsonPath, JSON.stringify(findings, null, 2))
  const quiet = process.argv.includes('--quiet')
  const suggestionWord = report.counts.Suggestion === 1 ? 'suggestion' : 'suggestions'
  const publicLine = `${rules.length} checks. ${report.counts.Pass} pass, ${report.counts.Suggestion} ${suggestionWord}, ${report.counts['Not applicable']} not applicable.`
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${publicLine}\n`)
  if (quiet) console.log(publicLine)
  else console.log(reportPath ? `${publicLine}\n${report.markdown}` : summarize(findings))
  const ranks = { none: 0, review: 0, warning: 1, error: 2 }
  const threshold = ranks[failOn] ?? 0
  const failed = threshold > 0 && findings.some((item) => (ranks[item.severity] ?? 0) >= threshold)
  process.exit(failed ? 1 : 0)
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (isMain && !process.argv.includes('--imported')) main()
