#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MARKER = '<!-- vibe-check -->'

export function linesInPatch(patch) {
  const lines = new Set()
  if (!patch) return lines
  let next = 0
  for (const line of patch.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line)
    if (hunk) {
      next = Number(hunk[1])
      continue
    }
    if (line.startsWith('\\')) continue
    if (line.startsWith('+') && !line.startsWith('+++')) {
      lines.add(next)
      next += 1
      continue
    }
    if (line.startsWith('-') && !line.startsWith('---')) continue
    next += 1
  }
  return lines
}

export function partition(findings, diffLinesByFile) {
  const inline = []
  const general = []
  for (const finding of findings) {
    if (diffLinesByFile.get(finding.file)?.has(finding.line)) inline.push(finding)
    else general.push(finding)
  }
  return { inline, general }
}

export function commentBody(finding, suggestion) {
  const parts = [`**${finding.id}** (${finding.severity}) ${finding.title}`]
  if (finding.extra) parts.push(finding.extra)
  if (suggestion) parts.push('', '```suggestion', suggestion, '```')
  else parts.push('', 'No automatic edit for this one.')
  return parts.join('\n')
}

export function suggestionFor(finding, sourceLine) {
  if (finding.id === 'V063' && /^\s*debugger;?\s*$/.test(sourceLine ?? '')) return ''
  return null
}

export function applyFixes(files) {
  const applied = []
  for (const file of files) {
    const relevant = file.findings.filter((finding) => finding.id === 'V063')
    if (!relevant.length) continue
    const ended = file.text.endsWith('\n')
    const lines = file.text.replace(/\n$/, '').split('\n')
    const remove = new Set(
      relevant
        .filter((finding) => suggestionFor(finding, lines[finding.line - 1]) === '')
        .map((finding) => finding.line),
    )
    if (!remove.size) continue
    const next = lines.filter((_, index) => !remove.has(index + 1)).join('\n')
    applied.push({
      file: file.file,
      text: ended ? `${next}\n` : next,
      findings: relevant.filter((finding) => remove.has(finding.line)),
    })
  }
  return applied
}

function generalNote(findings) {
  if (!findings.length) return ''
  return [
    MARKER,
    'Vibe check. These are not tied to a changed line, or they have no safe edit.',
    '',
    ...findings.map((finding) => `- ${finding.severity} ${finding.id} ${finding.title} — \`${finding.file}:${finding.line}\``),
  ].join('\n')
}

async function gh(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'agent-skills-vibe-check',
      ...(options.headers ?? {}),
    },
  })
  if (response.status === 404) return null
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${response.status} ${path} ${detail}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function upsertComment(repo, number, body) {
  const existing = await gh(`/repos/${repo}/issues/${number}/comments?per_page=100`)
  const prior = (existing ?? []).find((item) => String(item.body).includes(MARKER))
  const payload = JSON.stringify({ body })
  if (prior) {
    await gh(`/repos/${repo}/issues/comments/${prior.id}`, { method: 'PATCH', body: payload })
    return
  }
  await gh(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: payload })
}

async function review(repo, number, sha, inline, general) {
  const comments = inline.slice(0, 40).map((finding) => ({
    path: finding.file,
    line: finding.line,
    side: 'RIGHT',
    body: commentBody(finding, null),
  }))
  const body = generalNote(general) || `${MARKER}\nVibe check left notes on the changed lines.`
  try {
    await gh(`/repos/${repo}/pulls/${number}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ commit_id: sha, event: 'COMMENT', body, comments }),
    })
  } catch (error) {
    console.error(error.message)
    await upsertComment(repo, number, generalNote([...inline, ...general]))
  }
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function openFixPullRequest(root, repo, sha, applied, general) {
  const branch = `vibe-check/${sha.slice(0, 7)}`
  git(['config', 'user.name', 'github-actions[bot]'], root)
  git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], root)
  git(['checkout', '-B', branch], root)
  for (const change of applied) writeFileSync(join(root, change.file), change.text)
  git(['add', '--', ...applied.map((change) => change.file)], root)
  git(['commit', '-m', `Apply vibe-check fixes for ${sha.slice(0, 7)}\n\n[vibe-check]`], root)
  git(['push', 'origin', `HEAD:refs/heads/${branch}`], root)
  const patched = applied.flatMap((change) => change.findings)
  const body = [
    `Fixes from the vibe check on \`${sha}\`.`,
    '',
    '## Patched',
    ...patched.map((finding) => `- ${finding.id} ${finding.title} — \`${finding.file}:${finding.line}\``),
    '',
    generalNote(general),
  ].join('\n')
  return gh(`/repos/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: `Vibe check fixes for ${sha.slice(0, 7)}`,
      head: branch,
      base: 'main',
      body,
    }),
  })
}

async function main() {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_EVENT_PATH) return
  const findings = JSON.parse(readFileSync(process.env.FINDINGS_PATH, 'utf8'))
  if (!findings.length) return
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const repo = process.env.GITHUB_REPOSITORY
  const root = process.env.SOURCE_ROOT ?? process.cwd()
  if (event.pull_request) {
    const files = await gh(`/repos/${repo}/pulls/${event.pull_request.number}/files?per_page=100`)
    const diffLines = new Map((files ?? []).map((file) => [file.filename, linesInPatch(file.patch)]))
    const groups = partition(findings, diffLines)
    if (groups.inline.length) {
      await review(repo, event.pull_request.number, event.pull_request.head.sha, groups.inline, groups.general)
    } else {
      await upsertComment(repo, event.pull_request.number, generalNote(groups.general))
    }
    return
  }
  if (event.commits && String(event.head_commit?.message ?? '').includes('[vibe-check]')) return
  const sha = process.env.GITHUB_SHA
  const applied = applyFixes(
    [...new Set(findings.filter((finding) => finding.id === 'V063').map((finding) => finding.file))].map((file) => ({
      file,
      text: readFileSync(join(root, file), 'utf8'),
      findings: findings.filter((finding) => finding.file === file),
    })),
  )
  if (!applied.length) {
    console.log('No safe line edit. Findings are annotations on this run.')
    return
  }
  const existing = await gh(`/repos/${repo}/pulls?head=${repo.split('/')[0]}:${`vibe-check/${sha.slice(0, 7)}`}&state=open`)
  if (existing?.length) return
  const general = findings.filter((finding) => !applied.some((change) => change.findings.includes(finding)))
  await openFixPullRequest(root, repo, sha, applied, general)
}

if (process.argv[1]?.endsWith('suggest.mjs')) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
