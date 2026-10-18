// How the admin pages describe this experiment's simulation runs.
import { REQUESTS, VIEWS } from './simulation/engine/middlewareCatalog.js'
import { describeKey } from './simulation/engine/outcomes.js'
import { PRESETS } from './simulation/engine/urlPresets.js'

/** { setup, prediction, outcome } as short text for one SimulationRun. */
export function describeRun(run) {
  const { config, prediction, outcome } = run
  if (run.lab === 'middleware') {
    const guesses = [
      prediction.status && `status ${prediction.status}`,
      prediction.viewRuns && `view runs: ${prediction.viewRuns}`,
    ].filter(Boolean)
    return {
      setup: `${REQUESTS[config.request]?.label ?? config.request}; view ${(VIEWS[config.view]?.label ?? config.view).toLowerCase()}; ${config.middleware?.length ?? 0} middleware`,
      prediction: guesses.join(', '),
      outcome: `${outcome.status}, view ${outcome.viewCalled ? 'ran' : 'did not run'}${outcome.error ? ` (${outcome.error})` : ''}`,
    }
  }
  if (run.lab === 'urls') {
    const r = config.request ?? {}
    return {
      setup: [
        `${r.method ?? ''} ${r.path ?? ''}`.trim(),
        `APPEND_SLASH ${r.appendSlash ? 'on' : 'off'}, DEBUG ${r.debug ? 'on' : 'off'}`,
        // The student may have edited the patterns after picking a starting URLconf.
        `starting URLconf: ${PRESETS[config.preset]?.label ?? config.preset ?? 'unknown'}`,
      ].join('; '),
      prediction: describeKey(prediction.outcome),
      outcome: describeKey(outcome.key),
    }
  }
  return { setup: '', prediction: '', outcome: '' }
}
