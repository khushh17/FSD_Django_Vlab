// Prints every experiment's question banks as JSON (used by `manage.py seed_demo`).
// Usage: node scripts/export-question-banks.mjs
import { posttestBank } from '../src/experiments/django-request-response/data/posttestBank.js'
import { pretest } from '../src/experiments/django-request-response/data/pretest.js'

const brief = (q) => ({ id: q.id, levels: q.levels, answer: q.answer, options: q.options.length })

console.log(
  JSON.stringify({
    'django-request-response': {
      pretest: pretest.map(brief),
      posttest: posttestBank.map(brief),
      posttestLevels: ['easy', 'medium', 'hard'],
    },
  }),
)
