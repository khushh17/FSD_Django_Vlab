import CodeBlock from '../content/CodeBlock.jsx'
import RichText from './RichText.jsx'
import styles from './Quiz.module.css'

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f']

/**
 * One question, laid out like the reference quiz: bold question, then "a: …" radio options.
 * After submit: the correct option and a wrong choice are marked (in text as well as colour),
 * followed by the explanation and the source.
 */
export default function QuestionCard({ number, item, selected, submitted, onSelect }) {
  const { question, order } = item
  const name = `q-${question.id}`
  const answered = selected !== undefined
  const correct = selected === question.answer

  return (
    <fieldset className={styles.question}>
      <legend className={styles.legend}>
        {number}. <RichText text={question.question} />
      </legend>
      {question.code && <CodeBlock code={question.code} />}

      <div className={styles.answers}>
        {order.map((optionIndex, position) => {
          const isCorrect = optionIndex === question.answer
          const isChosen = optionIndex === selected
          let state = ''
          let note = ''
          if (submitted && isCorrect) {
            state = styles.correct
            note = isChosen ? ' (your answer, correct)' : ' (correct answer)'
          } else if (submitted && isChosen) {
            state = styles.wrong
            note = ' (your answer)'
          }
          return (
            <label key={optionIndex} className={`${styles.option} ${state}`}>
              <input
                type="radio"
                name={name}
                value={optionIndex}
                checked={isChosen}
                disabled={submitted}
                onChange={() => onSelect(question.id, optionIndex)}
              />{' '}
              {LETTERS[position]}: <RichText text={question.options[optionIndex]} />
              {note && <strong className={styles.note}>{note}</strong>}
            </label>
          )
        })}
      </div>

      {submitted && (
        <div className={styles.feedback}>
          <p className={`${styles.verdict} ${correct ? styles.correct : styles.wrong}`}>
            {answered ? (correct ? 'Correct.' : 'Incorrect.') : 'Not answered.'}
          </p>
          <p>
            <RichText text={question.explanation} />
          </p>
          <p className={styles.source}>
            Source:{' '}
            <a href={question.source} target="_blank" rel="noopener noreferrer">
              {question.source.replace(/^https:\/\//, '')}
            </a>
          </p>
        </div>
      )}
    </fieldset>
  )
}
