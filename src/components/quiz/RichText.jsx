import { Fragment } from 'react'

/** Renders question text with `inline code` and **bold** markers. Everything else is plain text. */
export default function RichText({ text }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return <Fragment key={i}>{part}</Fragment>
  })
}
