/*
 * Every experiment on the site, for pages that span experiments (the admin pages, and a
 * landing page later). To add an experiment: import its meta and question banks here, and
 * add its slug to LAB_EXPERIMENTS in backend/config/settings.py.
 */
import { describeRun as requestResponseRun } from './django-request-response/admin.js'
import { meta as requestResponse } from './django-request-response/meta.js'
import { posttestBank as requestResponsePosttest } from './django-request-response/data/posttestBank.js'
import { pretest as requestResponsePretest } from './django-request-response/data/pretest.js'

export const experiments = [
  {
    slug: requestResponse.slug,
    title: requestResponse.title,
    pretest: requestResponsePretest,
    posttest: requestResponsePosttest,
    posttestLevels: requestResponse.posttestLevels,
    // Simulation labs, as recorded in SimulationRun.lab
    labs: { middleware: 'Middleware lab', urls: 'URL resolver lab' },
    describeRun: requestResponseRun,
  },
]

export function findExperiment(slug) {
  return experiments.find((e) => e.slug === slug) ?? experiments[0]
}
