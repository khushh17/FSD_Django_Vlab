import { useSearchParams } from 'react-router-dom'
import { findExperiment } from '../experiments/registry.js'

/** The experiment chosen in the admin pages (?exp=slug), defaulting to the first. */
export function useExperiment() {
  const [params] = useSearchParams()
  return findExperiment(params.get('exp'))
}
