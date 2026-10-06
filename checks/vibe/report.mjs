import { materialize, rules as rawRules } from './rules.mjs'

const rules = rawRules.map(materialize)

function cell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

export function renderReport(findings) {
  const hits = new Map()
  for (const finding of findings) {
    if (!hits.has(finding.id)) hits.set(finding.id, [])
    hits.get(finding.id).push(finding)
  }
  const rows = rules.map((rule) => {
    const found = hits.get(rule.id) ?? []
    const automated = rule.kind !== 'review'
    let result = automated ? 'Pass' : 'Not automated'
    if (found.length) result = 'Suggestion'
    return { ...rule, result, found }
  })
  const counts = { Pass: 0, Suggestion: 0, 'Not automated': 0 }
  for (const row of rows) counts[row.result] += 1
  const lines = [
    '# Vibe check',
    '',
    'All 100 checks ran. A suggestion can be ignored. Nothing in this report fails the build.',
    '',
    '## Summary',
    '',
    '| Result | Checks |',
    '| --- | ---: |',
    `| Pass | ${counts.Pass} |`,
    `| Suggestion | ${counts.Suggestion} |`,
    `| Not automated | ${counts['Not automated']} |`,
    '',
    '## All checks',
    '',
    '| ID | Check | Result | Where |',
    '| --- | --- | --- | --- |',
  ]
  for (const row of rows) {
    const where = row.found.length
      ? row.found.map((finding) => `${finding.file}:${finding.line}`).join(', ')
      : '—'
    lines.push(`| ${row.id} | ${cell(row.title)} | ${row.result} | ${cell(where)} |`)
  }
  const suggestions = rows.filter((row) => row.result === 'Suggestion')
  lines.push('', '## Suggestions', '')
  if (!suggestions.length) lines.push('None.', '')
  for (const row of suggestions) {
    lines.push(`### ${row.id} ${row.title}`, '')
    for (const finding of row.found) {
      const extra = finding.extra ? ` (${finding.extra})` : ''
      lines.push(`- \`${finding.file}:${finding.line}\`${extra}`)
    }
    lines.push('')
  }
  return { markdown: `${lines.join('\n')}\n`, counts, rows }
}
