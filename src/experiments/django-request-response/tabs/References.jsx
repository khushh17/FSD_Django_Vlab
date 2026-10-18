import { references } from '../data/references.js'
import styles from './References.module.css'

export default function References() {
  return (
    <ol className={styles.list}>
      {references.map((ref) => (
        <li key={ref.url}>
          {ref.author}. “{ref.title}”. <em>{ref.source}</em>.
          <br />
          <a href={ref.url} className={styles.url} target="_blank" rel="noopener noreferrer">
            {ref.url}
          </a>
        </li>
      ))}
    </ol>
  )
}
