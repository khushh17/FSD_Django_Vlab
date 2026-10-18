import styles from './ExperimentTitle.module.css'

/** Experiment name shown centred at the top of every tab, as on the reference site. */
export default function ExperimentTitle({ title }) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
