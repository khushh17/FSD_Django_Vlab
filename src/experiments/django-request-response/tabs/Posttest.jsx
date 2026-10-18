import Quiz from '../../../components/quiz/Quiz.jsx'
import { posttestBank } from '../data/posttestBank.js'
import { meta } from '../meta.js'

export default function Posttest() {
  return (
    <Quiz
      bank={posttestBank}
      levels={meta.posttestLevels}
      count={10}
      storageKey="django-request-response:posttest"
      record={{ experiment: meta.slug, kind: 'posttest' }}
    />
  )
}
