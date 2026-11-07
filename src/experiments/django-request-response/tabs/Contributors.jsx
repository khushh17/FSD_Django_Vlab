import TableScroll from '../../../components/content/TableScroll.jsx'
import { developers, subjectMatterExperts } from '../data/contributors.js'
import styles from './Contributors.module.css'

// Layout follows the reference Contributors tab: an underlined section heading and a
// bordered table (SNo., Name, Email, Institute, ID) per group.
export default function Contributors() {
  return (
    <>
      {subjectMatterExperts.length > 0 && <PeopleTable title="Subject Matter Experts" people={subjectMatterExperts} />}
      <PeopleTable title="Developers" people={developers} />
    </>
  )
}

function PeopleTable({ title, people }) {
  // Optional columns appear only when someone in this table has a value for them.
  const showEmail = people.some((p) => p.email)
  const showId = people.some((p) => p.id)
  return (
    <>
      <h2>{title}</h2>
      <TableScroll label={title}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">SNo.</th>
              <th scope="col">Name</th>
              {showEmail && <th scope="col">Email</th>}
              <th scope="col">Institute</th>
              {showId && <th scope="col">ID</th>}
            </tr>
          </thead>
          <tbody>
            {people.map((person, i) => (
              <tr key={i}>
                <td className={styles.sno}>{i + 1}</td>
                <td>{person.name || '—'}</td>
                {showEmail && <td>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : '—'}</td>}
                <td>{person.institute || '—'}</td>
                {showId && <td>{person.id || '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </>
  )
}
