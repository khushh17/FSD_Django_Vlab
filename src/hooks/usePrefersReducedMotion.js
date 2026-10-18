import { useMediaQuery } from './useMediaQuery.js'

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
