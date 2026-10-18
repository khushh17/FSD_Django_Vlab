/**
 * Wraps a table so it scrolls sideways on narrow screens. The region is focusable and
 * labelled so keyboard users can scroll it too.
 */
export default function TableScroll({ label, children }) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <section className="table-scroll" tabIndex={0} aria-label={label}>
      {children}
    </section>
  )
}
