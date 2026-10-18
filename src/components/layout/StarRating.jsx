import { useId } from 'react'
import styles from './StarRating.module.css'

// Star outline from the reference site's rating widget (svc-rating/star.svg).
const STAR_PATH =
  'M14.1,0.43l3.44,8.05l8.72,0.78c0.39,0.03,0.67,0.37,0.64,0.76c-0.02,0.19-0.1,0.35-0.24,0.47l-6.6,5.76l1.95,8.54c0.09,0.38-0.15,0.75-0.53,0.84c-0.19,0.04-0.39,0-0.54-0.1l-7.5-4.48l-7.52,4.5c-0.33,0.2-0.76,0.09-0.96-0.24c-0.1-0.16-0.12-0.35-0.08-0.52l1.95-8.54l-6.6-5.76c-0.29-0.25-0.32-0.7-0.07-0.99C0.3,9.35,0.48,9.28,0.66,9.27l8.7-0.78l3.44-8.06c0.15-0.36,0.56-0.52,0.92-0.37C13.9,0.13,14.03,0.27,14.1,0.43z'

function Star({ fill }) {
  const clipId = useId()
  return (
    <svg className={styles.star} viewBox="-0.5 -0.5 27.9 26.65" aria-hidden="true">
      {fill === 'half' && (
        <defs>
          <clipPath id={clipId}>
            <rect x="-0.5" y="-0.5" width="13.95" height="26.65" />
          </clipPath>
        </defs>
      )}
      {fill === 'full' && <path d={STAR_PATH} className={styles.full} />}
      {fill === 'half' && <path d={STAR_PATH} className={styles.full} clipPath={`url(#${clipId})`} />}
      {fill !== 'full' && <path d={STAR_PATH} className={styles.outline} />}
    </svg>
  )
}

export default function StarRating({ rating, isOwn = false, className = '' }) {
  let label = 'Not yet rated'
  if (rating != null) label = isOwn ? `Your rating: ${rating} out of 5` : `Rated ${rating} out of 5`
  const fills = [0, 1, 2, 3, 4].map((i) => {
    if (rating == null) return 'empty'
    if (rating >= i + 1) return 'full'
    if (rating >= i + 0.5) return 'half'
    return 'empty'
  })
  return (
    <div className={`${styles.rating} ${className}`}>
      <span className="visually-hidden">{label}</span>
      {fills.map((fill, i) => (
        <Star key={i} fill={fill} />
      ))}
    </div>
  )
}
