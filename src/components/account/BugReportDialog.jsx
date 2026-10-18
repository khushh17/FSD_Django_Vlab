import Dialog from './Dialog.jsx'
import MessageForm from './MessageForm.jsx'

/** "Report a Bug" popup. `page` is the tab the student is on. */
export default function BugReportDialog({ experiment, page, pageLabel, onClose }) {
  return (
    <Dialog title="Report a Bug" onClose={onClose}>
      <MessageForm
        path="/api/bug-reports"
        field="description"
        body={{ experiment, page }}
        label={pageLabel ? `What went wrong on the ${pageLabel} page?` : 'What went wrong?'}
        hint="Say what you did, what you expected and what happened."
        submitLabel="Send report"
        successText="Thank you. Your report was sent."
        signInReason="Sign in to report a bug, so we can follow it up."
        onCancel={onClose}
      />
    </Dialog>
  )
}
