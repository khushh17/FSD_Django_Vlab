import { useState } from 'react'
import styles from './Figure.module.css'

/**
 * A sourced diagram loaded from public/diagrams/. Diagrams are never drawn here:
 * if the file is missing, a dashed placeholder shows the expected filename.
 *
 * src: filename in public/diagrams/   alt: description of the image
 * caption: figure caption              credit: source text   creditUrl: source link
 */
export default function Figure({ src, alt, caption, credit, creditUrl }) {
  const [missing, setMissing] = useState(false)
  const url = `${import.meta.env.BASE_URL}diagrams/${src}`

  return (
    <figure className={styles.figure}>
      {missing ? (
        <div className={styles.placeholder}>
          <code className={styles.filename}>public/diagrams/{src}</code>
          <span>{alt}</span>
        </div>
      ) : (
        <img src={url} alt={alt} className={styles.img} onError={() => setMissing(true)} />
      )}
      <figcaption className={styles.caption}>
        {caption}
        <span className={styles.credit}>
          Source:{' '}
          {credit && creditUrl ? (
            <a href={creditUrl} target="_blank" rel="noopener noreferrer">
              {credit}
            </a>
          ) : (
            credit || 'TODO'
          )}
        </span>
      </figcaption>
    </figure>
  )
}
