#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { materialize, rules as rawRules } from './rules.mjs'
import { renderReport } from './report.mjs'

const rules = rawRules.map(materialize)
const TEXT = new Set(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'go', 'rb', 'php', 'java', 'rs', 'vue', 'svelte', 'css', 'html', 'yml', 'yaml', 'sh', 'toml', 'env'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'fixtures', '.git', 'playwright-report', 'test-results'])
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'])

function argValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? null : process.argv[index + 1]
}

export function scan(root) {
  const files = listFiles(root)
  const findings = []
  for (const file of files) {
    const rel = relative(root, file)
    if (SKIP_FILES.has(rel.split('/').pop())) continue
    if (rel.endsWith('checks/vibe/rules.mjs')) continue
    const text = readFileSync(file, 'utf8')
    for (const rule of rules) {
      if (rule.kind === 'regex') matchLines(findings, rule, rel, text)
      else if (rule.kind === 'long-file') longFile(findings, rule, rel, text)
      else if (rule.kind === 'tracked-env') trackedEnv(findings, rule, rel)
      else if (rule.kind === 'dep-range' || rule.kind === 'git-dep') {
        if (rel.endsWith('package.json')) deps(findings, rule, rel, text)
      }
    }
  }
  return findings
}

function matchLines(findings, rule, rel, text) {
  if (isTestPath(rel) && rule.id !== 'V071' && rule.id !== 'V072') return
  if (rule.id === 'V027' && !/^(src|app|lib)\//.test(rel)) return
  if (rule.id === 'V062' && !/^src\//.test(rel)) return
  if (rule.id === 'V062' && rel === 'src/server.js') return
  const re = new RegExp(rule.pattern, 'g')
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    if (re.test(lines[i])) findings.push(hit(rule, rel, i + 1))
    re.lastIndex = 0
  }
}

function longFile(findings, rule, rel, text) {
  if (!/\.(jsx?|tsx?|mjs)$/.test(rel) || /(^|\/)(tests?|__tests__)\//.test(rel)) return
  const count = text.split(/\r?\n/).length
  if (count > 800) findings.push(hit(rule, rel, 1, `${count} lines`))
}

function trackedEnv(findings, rule, rel) {
  if (rel.endsWith('.example')) return
  if (/(^|\/)\.env$/.test(rel) || /(^|\/)\.env\.[^/]+$/.test(rel)) findings.push(hit(rule, rel, 1))
}

function deps(findings, rule, rel, text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    return
  }
  const groups = { ...json.dependencies, ...json.devDependencies }
  for (const [name, version] of Object.entries(groups ?? {})) {
    if (rule.kind === 'dep-range' && (version === '*' || version === 'latest')) {
      findings.push(hit(rule, rel, 1, `${name}@${version}`))
    }
    if (rule.kind === 'git-dep' && /^(git\+|github:|gitlab:)/.test(String(version))) {
      findings.push(hit(rule, rel, 1, `${name}@${version}`))
    }
  }
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

function isTestPath(rel) {
  return /(^|\/)(tests?|__tests__|spec)\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)
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
    `${rules.length} mistakes. ${errors.length} errors, ${warnings.length} warnings. Review items are not automated.`,
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
  const findings = scan(root)
  const report = renderReport(findings)
  const reportPath = argValue('--report')
  if (reportPath) writeFileSync(reportPath, report.markdown)
  const jsonPath = argValue('--json')
  if (jsonPath) writeFileSync(jsonPath, JSON.stringify(findings, null, 2))
  const quiet = process.argv.includes('--quiet')
  const publicLine = `100 checks. ${report.counts.Pass} pass, ${report.counts.Suggestion} suggestions, ${report.counts['Not automated']} not automated.`
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
