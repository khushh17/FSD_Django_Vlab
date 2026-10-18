import Quiz from '../../../components/quiz/Quiz.jsx'
import { pretest } from '../data/pretest.js'
import { meta } from '../meta.js'

export default function Pretest() {
  return <Quiz bank={pretest} storageKey="django-request-response:pretest" record={{ experiment: meta.slug, kind: 'pretest' }} />
}
