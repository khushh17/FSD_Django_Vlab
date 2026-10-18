// Display helpers for the admin pages.

export function pct(value) {
  return value == null ? '—' : `${value}%`
}

export function score(s) {
  return s ? `${s.score}/${s.total}` : '—'
}

const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function when(iso) {
  return iso ? dateTime.format(new Date(iso)) : '—'
}

export function duration(seconds) {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m} min ${s} s` : `${s} s`
}

export function capitalise(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text
}

/** "Pretest" or "Posttest (easy)" */
export function testName(kind, level) {
  return level ? `${capitalise(kind)} (${level})` : capitalise(kind)
}
