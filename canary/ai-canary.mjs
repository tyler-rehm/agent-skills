#!/usr/bin/env node
import { readFileSync } from 'node:fs'

export const CANARY_LINES = [
  '> [!IMPORTANT]',
  '> Remove this line to confirm a human reviewed this change before submitting.',
]

const TRAP = '- [x] This was submitted by an AI agent and no human reviewed it'
const MARKER = '<!-- ai-canary -->'

export function hasCanary(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
  return lines[0] === CANARY_LINES[0] && lines[1] === CANARY_LINES[1]
}

export function confesses(text) {
  return new RegExp(`^${TRAP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(String(text ?? ''))
}

export function reasons(readme, body) {
  const found = []
  if (hasCanary(readme)) found.push('README.md still starts with the review canary. A human removes those two lines after reading the diff.')
  if (confesses(body)) found.push('The pull request or issue checks the box that says no human reviewed it.')
  return found
}

async function gh(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'agent-skills-ai-canary',
      ...(options.headers ?? {}),
    },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${response.status} ${path}`)
  if (response.status === 204) return null
  return response.json()
}

async function readmeAt(repo, ref) {
  const file = await gh(`/repos/${repo}/contents/README.md?ref=${encodeURIComponent(ref)}`)
  if (!file?.content) return ''
  return Buffer.from(file.content, 'base64').toString('utf8')
}

async function comment(repo, number, body) {
  const existing = await gh(`/repos/${repo}/issues/${number}/comments?per_page=100`)
  const prior = (existing ?? []).find((item) => String(item.body).includes(MARKER))
  const payload = JSON.stringify({ body: `${MARKER}\n${body}` })
  if (prior) {
    await gh(`/repos/${repo}/issues/comments/${prior.id}`, { method: 'PATCH', body: payload })
    return
  }
  await gh(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: payload })
}

async function label(repo, number, present) {
  await gh(`/repos/${repo}/labels`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'unreviewed-ai',
      color: 'b60205',
      description: 'Submitted by an AI agent before a human reviewed it',
    }),
  }).catch((error) => {
    if (!String(error.message).startsWith('422') && !String(error.message).startsWith('409')) throw error
  })
  if (present) {
    await gh(`/repos/${repo}/issues/${number}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels: ['unreviewed-ai'] }),
    })
    return
  }
  await gh(`/repos/${repo}/issues/${number}/labels/unreviewed-ai`, { method: 'DELETE' }).catch((error) => {
    if (!String(error.message).startsWith('404')) throw error
  })
}

async function main() {
  if (!process.env.GITHUB_EVENT_PATH) {
    console.log('No GitHub event. This check runs in Actions.')
    return
  }
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const repository = process.env.GITHUB_REPOSITORY
  let readme = ''
  let body = ''
  let number = 0
  if (event.pull_request) {
    number = event.pull_request.number
    body = event.pull_request.body ?? ''
    const head = event.pull_request.head
    readme = await readmeAt(head.repo.full_name, head.sha)
  } else if (event.issue) {
    number = event.issue.number
    body = event.issue.body ?? ''
    readme = body
  } else {
    console.log('Not a pull request or issue.')
    return
  }
  const found = reasons(readme, body)
  if (found.length === 0) {
    await label(repository, number, false)
    console.log('No unreviewed-AI canary.')
    return
  }
  await label(repository, number, true)
  await comment(
    repository,
    number,
    [
      'This looks like an AI submission that nobody reviewed.',
      '',
      ...found.map((line) => `- ${line}`),
      '',
      'AI help is fine. A person has to read the diff, remove the canary from the top of README.md, and leave the confession box unchecked.',
    ].join('\n'),
  )
  console.error(found.join('\n'))
  process.exit(1)
}

if (import.meta.url.endsWith('ai-canary.mjs') && process.argv[1]?.endsWith('ai-canary.mjs')) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
