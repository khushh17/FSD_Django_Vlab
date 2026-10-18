// Pure helpers for the quiz engine (no React).

export function shuffle(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick `count` questions from `pool`, spread across topics: topics are visited in a
 * random order, one question at a time, until `count` are chosen.
 * Returns them in bank order unless `shuffleOrder` is set.
 */
export function pickQuestions(pool, count, { shuffleOrder = false } = {}) {
  if (pool.length <= count) return shuffleOrder ? shuffle(pool) : [...pool]

  const byTopic = new Map()
  for (const q of pool) {
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, [])
    byTopic.get(q.topic).push(q)
  }
  const queues = shuffle([...byTopic.values()].map((qs) => shuffle(qs)))
  const chosen = new Set()
  while (chosen.size < count) {
    for (const queue of queues) {
      if (chosen.size >= count) break
      const q = queue.shift()
      if (q) chosen.add(q)
    }
  }
  const picked = pool.filter((q) => chosen.has(q))
  return shuffleOrder ? shuffle(picked) : picked
}

/**
 * Build one attempt: each item keeps the question and the display order of its options
 * (`order[k]` = authored index of the option shown at position k).
 */
export function buildAttempt(pool, count, { shuffleAll }) {
  return pickQuestions(pool, count, { shuffleOrder: shuffleAll }).map((question) => {
    const indices = question.options.map((_, i) => i)
    return { question, order: shuffleAll ? shuffle(indices) : indices }
  })
}

/** Score an attempt. `answers` maps question id -> authored option index. */
export function scoreAttempt(attempt, answers) {
  return attempt.filter(({ question }) => answers[question.id] === question.answer).length
}

// localStorage, wrapped: storage may be unavailable (private mode, blocked cookies).
const PREFIX = 'django-vlab:quiz:'

export function loadScore(key) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const value = JSON.parse(raw)
    return typeof value?.score === 'number' && typeof value?.total === 'number' ? value : null
  } catch {
    return null
  }
}

export function saveScore(key, score, total) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ score, total, at: new Date().toISOString() }))
  } catch {
    // Storage unavailable: the score is simply not remembered.
  }
}
