import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../account/authContext.js'
import RecordNote from '../account/RecordNote.jsx'
import LevelPicker from './LevelPicker.jsx'
import QuestionCard from './QuestionCard.jsx'
import ResultSummary from './ResultSummary.jsx'
import { buildAttempt, loadScore, saveScore, scoreAttempt } from './quizLogic.js'
import styles from './Quiz.module.css'

/**
 * Quiz engine.
 *   bank:       questions ({ id, topic, levels, question, code?, options, answer, explanation, source })
 *   levels:     e.g. ['easy', 'medium', 'hard'] for the level picker; omit for single-level mode
 *   count:      questions per attempt (single-level mode shows the whole bank)
 *   storageKey: localStorage key prefix for the last score (per level)
 *   record:     { experiment, kind: 'pretest' | 'posttest' } to save attempts to the signed-in
 *               student's record (when a backend is configured)
 *
 * First attempt: questions in bank order, options as authored.
 * Retake: question order and option order are shuffled; the correct answer stays correct.
 */
export default function Quiz({ bank, levels, count = 10, storageKey, record }) {
  const auth = useAuth()
  const multiLevel = Boolean(levels?.length)
  const scoreKey = (level) => (multiLevel ? `${storageKey}:${level}` : storageKey)
  const poolFor = (level) => (multiLevel ? bank.filter((q) => q.levels.includes(level)) : bank)
  const sizeFor = (level) => (multiLevel ? count : poolFor(level).length)

  const [level, setLevel] = useState(multiLevel ? null : 'single')
  const [attempt, setAttempt] = useState(() =>
    multiLevel ? null : buildAttempt(bank, bank.length, { shuffleAll: false }),
  )
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  // When the current attempt started, whether it is a retake, and whether it was recorded.
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [retake, setRetake] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const [lastScores, setLastScores] = useState(() =>
    Object.fromEntries((multiLevel ? levels : ['single']).map((l) => [l, loadScore(scoreKey(l))])),
  )
  const resultRef = useRef(null)
  const topRef = useRef(null)
  // Focus request applied after the next render: { target: 'result' | 'top' }. A new object
  // each time, so repeated requests for the same target still run.
  const [focusRequest, setFocusRequest] = useState(null)

  useEffect(() => {
    if (focusRequest?.target === 'result') resultRef.current?.focus()
    if (focusRequest?.target === 'top') {
      topRef.current?.scrollIntoView({ block: 'start' })
      topRef.current?.focus({ preventScroll: true })
    }
  }, [focusRequest])

  function start(nextLevel, shuffleAll) {
    setLevel(nextLevel)
    setAttempt(buildAttempt(poolFor(nextLevel), sizeFor(nextLevel), { shuffleAll }))
    setAnswers({})
    setSubmitted(false)
    setStartedAt(Date.now())
    setRetake(shuffleAll)
    setRecorded(false)
  }

  function onSelect(questionId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  function onSubmit(event) {
    event.preventDefault()
    const score = scoreAttempt(attempt, answers)
    saveScore(scoreKey(level), score, attempt.length)
    setLastScores((prev) => ({ ...prev, [level]: { score, total: attempt.length } }))
    setSubmitted(true)
    if (record) {
      setRecorded(
        auth.record('quiz_attempt', record.experiment, {
          kind: record.kind,
          level: multiLevel ? level : '',
          score,
          total: attempt.length,
          durationSeconds: Math.round((Date.now() - startedAt) / 1000),
          retake,
          answers: attempt.map(({ question }) => ({
            questionId: question.id,
            chosen: answers[question.id] ?? null,
            correct: answers[question.id] === question.answer,
          })),
        }),
      )
    }
    setFocusRequest({ target: 'result' })
  }

  function onRetake() {
    start(level, true)
    setFocusRequest({ target: 'top' })
  }

  return (
    <div className={styles.quiz}>
      {multiLevel && (
        <LevelPicker
          levels={levels}
          current={level}
          lastScores={lastScores}
          onPick={(next) => start(next, false)}
        />
      )}

      {attempt && (
        <form onSubmit={onSubmit} noValidate>
          <div ref={topRef} tabIndex={-1} className={styles.top}>
            {multiLevel && (
              <p className={styles.attemptInfo}>
                {level[0].toUpperCase() + level.slice(1)} level: {attempt.length} questions.
              </p>
            )}
          </div>
          {attempt.map((item, i) => (
            <QuestionCard
              key={item.question.id}
              number={i + 1}
              item={item}
              selected={answers[item.question.id]}
              submitted={submitted}
              onSelect={onSelect}
            />
          ))}

          {!submitted && (
            <div className={styles.submitRow}>
              <button type="submit" className={styles.primaryButton}>
                Submit Quiz
              </button>
            </div>
          )}
        </form>
      )}

      {submitted && (
        <ResultSummary
          ref={resultRef}
          score={scoreAttempt(attempt, answers)}
          total={attempt.length}
          onRetake={onRetake}
        >
          {record && <RecordNote recorded={recorded} what="score" />}
        </ResultSummary>
      )}
    </div>
  )
}
