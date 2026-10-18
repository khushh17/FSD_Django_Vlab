import MessageForm from '../../../components/account/MessageForm.jsx'
import { backendEnabled } from '../../../config/backend.js'
import { feedback } from '../../../config/site.js'
import { meta } from '../meta.js'
import styles from './Feedback.module.css'

// Layout and wording follow the reference Feedback tab. The reference's "It will only take
// 3 minutes" is left out because it describes the Virtual Labs form, not ours.
export default function Feedback() {
  return (
    <>
      <h2 className={styles.heading}>Feedback</h2>
      <p>
        <b>Dear User</b>,
      </p>
      <p>
        Thanks for using Virtual Labs. Your opinion is valuable to us. To help us improve, we’d
        like to ask you a few questions about your experience. Your answers will help us make
        Virtual Labs better for you and other users.
      </p>
      {backendEnabled && (
        <div className={styles.form}>
          <MessageForm
            path="/api/feedback"
            field="message"
            body={{ experiment: meta.slug }}
            label="Your feedback on this experiment"
            hint="What helped you, what was confusing, and what we should change."
            submitLabel="Send feedback"
            successText="Thank you. Your feedback was sent."
            signInReason="Sign in to send feedback on this experiment."
          />
        </div>
      )}
      {(feedback.formUrl || !backendEnabled) && (
        <p className={styles.action}>
          {feedback.formUrl ? (
            <a
              href={feedback.formUrl}
              className={styles.button}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share Your Experience
            </a>
          ) : (
            // TODO: Google Form URL (config/site.js). Inert until set.
            <button type="button" className={styles.button}>
              Share Your Experience
            </button>
          )}
        </p>
      )}
      <p>
        Thanks for your time !
        <br />
        <b>{feedback.signature}</b>
      </p>
    </>
  )
}
