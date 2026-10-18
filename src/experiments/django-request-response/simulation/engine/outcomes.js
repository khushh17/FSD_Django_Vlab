// URL lab outcomes, as offered in the prediction list and stored in SimulationRun records.

export const OUTCOME_TEXT = {
  'not-found': '404 Not Found',
  redirect: '301 redirect (APPEND_SLASH)',
  'runtime-error': 'RuntimeError (500)',
  welcome: '“The install worked successfully!” page (200)',
}

/** 'view:post_by_year' -> 'calls post_by_year'; other keys -> their text. */
export function describeKey(key) {
  if (!key) return ''
  if (key.startsWith('view:')) return `calls ${key.slice(5)}`
  return OUTCOME_TEXT[key] ?? key
}
