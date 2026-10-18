import Aim from './Aim.jsx'
import Contributors from './Contributors.jsx'
import Feedback from './Feedback.jsx'
import Posttest from './Posttest.jsx'
import Pretest from './Pretest.jsx'
import Procedure from './Procedure.jsx'
import References from './References.jsx'
import Simulation from './Simulation.jsx'
import Theory from './Theory.jsx'

// Route slug (meta.tabs[].slug) -> tab component
export const tabComponents = {
  aim: Aim,
  theory: Theory,
  pretest: Pretest,
  procedure: Procedure,
  simulation: Simulation,
  posttest: Posttest,
  references: References,
  contributors: Contributors,
  feedback: Feedback,
}
