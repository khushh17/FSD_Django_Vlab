import TableScroll from '../../../components/content/TableScroll.jsx'
import { developers } from '../data/contributors.js'
import styles from './Contributors.module.css'

const Todo = () => <span className={styles.todo}>TODO</span>

// Layout follows the reference Contributors tab: an underlined section heading and a
// bordered table (SNo., Name, Email, Institute, ID).
export default function Contributors() {
  return (
    <>
      <h2>Developers</h2>
      <TableScroll label="Developers">
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">SNo.</th>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Institute</th>
              <th scope="col">ID</th>
            </tr>
          </thead>
          <tbody>
            {developers.map((person, i) => (
              <tr key={i}>
                <td className={styles.sno}>{i + 1}</td>
                <td>{person.name || <Todo />}</td>
                <td>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <Todo />}</td>
                <td>{person.institute || <Todo />}</td>
                <td>{person.id || <Todo />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  )
}
