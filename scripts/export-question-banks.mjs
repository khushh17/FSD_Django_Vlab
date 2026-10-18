// Question banks as JSON, from the experiments' data files.
//
//   node scripts/export-question-banks.mjs           print the banks (used by `manage.py seed_demo`)
//   node scripts/export-question-banks.mjs --write   update backend/labs/question_keys.json
//   node scripts/export-question-banks.mjs --check   fail if that file is out of date
//
// The backend marks quiz answers with question_keys.json, so run `npm run export:keys`
// after changing any question's answer, options or levels.
import { readFileSync, writeFileSync } from 'node:fs'
import { posttestBank } from '../src/experiments/django-request-response/data/posttestBank.js'
import { pretest } from '../src/experiments/django-request-response/data/pretest.js'

const KEYS_FILE = new URL('../backend/labs/question_keys.json', import.meta.url)

const experiments = {
  'django-request-response': { pretest, posttest: posttestBank, posttestLevels: ['easy', 'medium', 'hard'] },
}

const brief = (q) => ({ id: q.id, levels: q.levels, answer: q.answer, options: q.options.length })

function keys() {
  const out = {}
  for (const [slug, e] of Object.entries(experiments)) {
    const questions = {}
    for (const [kind, bank] of [['pretest', e.pretest], ['posttest', e.posttest]]) {
      for (const q of bank) {
        if (questions[q.id]) throw new Error(`${slug}: duplicate question id ${q.id}`)
        questions[q.id] = { kind, levels: kind === 'posttest' ? q.levels : [], answer: q.answer, options: q.options.length }
      }
    }
    out[slug] = { posttestLevels: e.posttestLevels, questions }
  }
  return `${JSON.stringify(out, null, 2)}\n`
}

const mode = process.argv[2]
if (mode === '--write') {
  writeFileSync(KEYS_FILE, keys())
  console.log('Updated backend/labs/question_keys.json')
} else if (mode === '--check') {
  let current = ''
  try {
    current = readFileSync(KEYS_FILE, 'utf8')
  } catch {
    // missing file: reported below
  }
  if (current.replace(/\r\n/g, '\n') !== keys()) {
    console.error('backend/labs/question_keys.json is out of date. Run: npm run export:keys')
    process.exit(1)
  }
  console.log('question_keys.json is up to date')
} else {
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(experiments).map(([slug, e]) => [
          slug,
          { pretest: e.pretest.map(brief), posttest: e.posttest.map(brief), posttestLevels: e.posttestLevels },
        ]),
      ),
    ),
  )
}
