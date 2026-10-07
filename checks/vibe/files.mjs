export function isTestPath(rel) {
  return /(^|\/)(tests?|__tests__|spec)\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)
}

export function isJs(rel) {
  return /\.(jsx?|mjs|cjs|tsx?|vue|svelte)$/.test(rel)
}

export function isJsTs(rel) {
  return /\.(jsx?|mjs|cjs|tsx?)$/.test(rel)
}

export function isTs(rel) {
  return /\.tsx?$/.test(rel)
}

export function isPy(rel) {
  return rel.endsWith('.py')
}

export function isGo(rel) {
  return rel.endsWith('.go')
}

export function isRb(rel) {
  return rel.endsWith('.rb')
}

export function isConfigText(rel) {
  return isCode(rel) || /\.(json|ya?ml|toml)$/.test(rel)
}

export function isSourceConfig(rel) {
  return /\.(jsx?|mjs|cjs|tsx?|py|json|ya?ml|toml)$/.test(rel)
}

export function hasPathSegment(rel, names) {
  return rel.split('/').some((part) => names.has(part.toLowerCase()))
}

export function isHtmlish(rel) {
  return /\.(html?|jsx|tsx|vue|svelte)$/.test(rel)
}

export function isWeb(rel) {
  return isJs(rel) || isHtmlish(rel) || rel.endsWith('.css')
}

export function isCode(rel) {
  return /\.(jsx?|mjs|cjs|tsx?|vue|svelte|py|go|rb|php|java|rs)$/.test(rel)
}

export function isAssign(rel) {
  return isCode(rel) || /\.(ya?ml|toml)$/.test(rel) || rel.endsWith('.env') || /\.env\./.test(rel)
}

export function isSql(rel) {
  return /\.(sql|prisma)$/.test(rel) || /migrat/i.test(rel)
}

export function isGenerated(rel) {
  return /(^|\/)(vendor|generated|third_party|dist)\//.test(rel) || rel.endsWith('.min.js')
}

export function isCommentLine(line, rel) {
  const text = line.trim()
  if (!text) return false
  if (text.startsWith('<!--')) return true
  if (isPy(rel) || rel.endsWith('.rb') || rel.endsWith('.sh') || /\.ya?ml$/.test(rel)) return text.startsWith('#')
  return text.startsWith('//') || text.startsWith('/*') || text.startsWith('*')
}

const SCOPES = {
  V007: 'assign',
  V011: 'js',
  V012: 'js',
  V014: 'js-ts',
  V015: 'js',
  V016: 'js-py',
  V017: 'py',
  V018: 'tls',
  V019: 'web',
  V023: 'js-py',
  V024: 'html',
  V025: 'js',
  V026: 'js',
  V027: 'config-text',
  V028: 'html',
  V048: 'js-py-sql',
  V050: 'sql',
  V051: 'manifest',
  V052: 'manifest',
  V053: 'manifest',
  V054: 'manifest',
  V055: 'manifest',
  V056: 'workflow',
  V061: 'catch',
  V062: 'js',
  V063: 'js',
  V064: 'code',
  V065: 'code',
  V067: 'py',
  V070: 'js',
  V071: 'js',
  V072: 'js',
  V073: 'js',
  V074: 'js',
  V075: 'ts',
  V078: 'e2e',
  V079: 'tests',
  V081: 'code',
  V082: 'html',
  V083: 'code',
  V086: 'code',
  V091: 'js',
  V092: 'source-config',
  V097: 'js-py',
  V098: 'engines',
}

export function ruleScope(rule) {
  return SCOPES[rule.id] ?? 'any'
}

export function fileInScope(scope, rel) {
  if (scope === 'any') return true
  if (scope === 'js') return isJs(rel)
  if (scope === 'js-ts') return isJsTs(rel)
  if (scope === 'py') return isPy(rel)
  if (scope === 'js-py') return isJs(rel) || isPy(rel)
  if (scope === 'tls') return isJs(rel) || isPy(rel) || isGo(rel)
  if (scope === 'catch') return isJs(rel) || isPy(rel) || isRb(rel)
  if (scope === 'config-text') return isConfigText(rel)
  if (scope === 'source-config') return isSourceConfig(rel)
  if (scope === 'html') return isHtmlish(rel)
  if (scope === 'web') return isWeb(rel)
  if (scope === 'ts') return isTs(rel)
  if (scope === 'code') return isCode(rel)
  if (scope === 'assign') return isAssign(rel)
  if (scope === 'sql') return isSql(rel)
  if (scope === 'js-py-sql') return isJs(rel) || isPy(rel) || isSql(rel)
  if (scope === 'tests') return isTestPath(rel)
  if (scope === 'workflow') return rel.startsWith('.github/workflows/') && /\.ya?ml$/.test(rel)
  if (scope === 'e2e') return /(^|\/)(playwright|cypress)\.config\.[cm]?[jt]s$/.test(rel)
  return false
}

export function scopeState(scope, scopes) {
  if (!scopes) return 'run'
  if (scope === 'any') return 'run'
  const present = {
    js: scopes.js,
    'js-ts': scopes.js,
    py: scopes.py,
    'js-py': scopes.js || scopes.py,
    tls: scopes.js || scopes.py || scopes.go,
    catch: scopes.js || scopes.py || scopes.rb,
    html: scopes.html,
    web: scopes.web,
    ts: scopes.ts,
    code: scopes.code,
    assign: scopes.assign,
    sql: scopes.sql,
    'config-text': scopes.code || scopes.config,
    'source-config': scopes.sourceConfig,
    'js-py-sql': scopes.js || scopes.py || scopes.sql,
    tests: scopes.tests,
    workflow: scopes.workflow,
    e2e: scopes.e2e,
    manifest: scopes.manifest,
    engines: scopes.engines,
  }
  if (!(scope in present)) return 'run'
  return present[scope] ? 'run' : 'na'
}
