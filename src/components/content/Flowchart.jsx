import styles from './Flowchart.module.css'

/**
 * A vertical flowchart drawn with HTML and CSS (an ordered list underneath, so it reads
 * in order without the visuals).
 *
 * nodes: [{ type: 'start' | 'step' | 'decision' | 'end', text, yes?, no? }]
 *   Nodes are numbered from 1. For a decision, `yes` / `no` describe where each answer
 *   goes, e.g. 'back to step 6' or 'continue'.
 */
export default function Flowchart({ title, nodes }) {
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>{title}</figcaption>
      <ol className={styles.chart}>
        {nodes.map((node, i) => (
          <li key={i} className={`${styles.node} ${styles[node.type]}`}>
            <span className={styles.box}>
              <span className={styles.number}>{i + 1}</span>
              <span className={styles.text}>{node.text}</span>
            </span>
            {node.type === 'decision' && (
              <span className={styles.branches}>
                <span className={styles.branch}>
                  <strong>Yes</strong> → {node.yes}
                </span>
                <span className={styles.branch}>
                  <strong>No</strong> → {node.no}
                </span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </figure>
  )
}
