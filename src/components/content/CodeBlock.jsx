import { Highlight, themes } from 'prism-react-renderer'
import styles from './CodeBlock.module.css'

// prism-react-renderer's light GitHub theme, with the token colours that fall below WCAG AA
// (4.5:1) on its #f6f8fa background darkened just enough to pass.
const DARKER = {
  '#999988': '#717164', // comments
  '#e3116c': '#da1068', // strings
  '#36acaa': '#277c7b', // numbers, booleans, constants
  '#00a4db': '#0079a2', // keywords (atrule), attribute names
  '#d73a49': '#ce3846', // functions
}
const theme = {
  ...themes.github,
  styles: themes.github.styles.map((entry) =>
    DARKER[entry.style.color] ? { ...entry, style: { ...entry.style, color: DARKER[entry.style.color] } } : entry,
  ),
}

/**
 * Highlighted code. `language` is a Prism language bundled with prism-react-renderer
 * (e.g. "python"); use "text" for shell commands and console output.
 * `title` names the file (e.g. "mysite/urls.py") and labels the scrollable region.
 */
export default function CodeBlock({ code, language = 'python', title }) {
  return (
    <figure className={styles.figure}>
      {title && <figcaption className={styles.title}>{title}</figcaption>}
      <Highlight code={code.trim()} language={language} theme={theme}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          // Scrollable region: focusable so keyboard users can scroll long lines.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          <pre className={`${styles.pre} ${className}`} style={style} tabIndex={0} aria-label={title}>
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </figure>
  )
}
