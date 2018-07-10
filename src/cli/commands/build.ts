/**
 * houston/src/cli/commands/build.ts
 * Builds a project with the worker
 */

// Command line files are allowed to have console log statements
// tslint:disable no-console

import * as fs from 'fs-extra'
import * as path from 'path'
import * as semver from 'semver'

import { Config } from '../../lib/config'
import { levelIndex } from '../../lib/log/level'
import { createCodeRepository } from '../../lib/service'
import { sanitize } from '../../lib/utility/rdnn'
import { Build } from '../../worker/preset/build'
import { IContext } from '../../worker/type'
import { Worker } from '../../worker/worker'
import { setup } from '../utilities'

export const command = 'build <repo> <version>'
export const describe = 'Builds a repository with the worker process'

export const builder = (yargs) => {
  return yargs
    .positional('repo', {
      describe: 'Full repository URL',
      type: 'string'
    })
    .positional('version', {
      coerce: semver.valid,
      default: '0.0.1',
      describe: 'Semver version to build for',
      type: 'string'
    })
    .option('type', {
      choices: ['app', 'system-app', 'library'],
      default: 'app',
      describe: 'The type of project',
      type: 'string'
    })
    .option('name-developer', {
      describe: 'Developer\'s name',
      type: 'string'
    })
    .option('name-domain', {
      alias: 'n',
      coerce: sanitize,
      describe: 'Reverse Domain Name Notation',
      type: 'string'
    })
    .option('name-human', {
      describe: 'Human readable name',
      type: 'string'
    })
    .option('references', {
      describe: 'References to pull',
      type: 'array'
    })
}

/**
 * Creates a basic context object for information about the build
 *
 * @param {object} argv
 * @param {Repository} repository
 * @return {IContext}
 */
function buildContext (argv, repository) {
  const nameDomain = argv['name-domain'] || repository.rdnn
  const nameDeveloper = argv['name-developer'] || 'Rabbitbot'
  const nameHuman = argv['name-human'] || 'Application' // TODO: Better name?
  const references = argv.references || [`refs/tags/${argv.version}`]

  const obj : IContext = {
    appcenter: {},
    appstream: '',
    architecture: '',
    changelog: [],
    distribution: '',
    logs: [],
    nameDeveloper,
    nameDomain,
    nameHuman,
    references,
    type: argv.type,
    version: argv.version
  }

  return obj
}

function logSpacer () {
  console.log('')
  console.log('='.repeat(80))
  console.log('')
}

/**
 * Logs all of the logs to the console
 *
 * @param {Log[]} logs
 * @return {void}
 */
function logLogs (logs) {
  for (const log of logs.sort((a, b) => (b.level - a.level))) {
    logSpacer()
    console.log(log.toString())
  }
}

export async function handler (argv) {
  const { app } = setup(argv)

  const repository = createCodeRepository(argv.repo)
  const context = buildContext(argv, repository)

  const worker = Build(app, repository, context)

  console.log(`Running build for ${argv.repo} version ${argv.version}`)

  await worker.setup()
  await worker.run()

  for (const pkg of worker.result.packages) {
    if (pkg.path != null && await fs.exists(pkg.path)) {
      const fileName = path.resolve(process.cwd(), path.basename(pkg.path))
      await fs.copy(pkg.path, fileName, { overwrite: true })
    }
  }

  if (worker.fails) {
    console.error(`Error while running build for ${argv.repo} for ${argv.version}`)
    logLogs(worker.result.logs)
    logSpacer()

    process.exit(1)
  } else {
    console.log(`Built ${argv.repo} for version ${argv.version}`)
    logLogs(worker.result.logs)
    logSpacer()

    process.exit(0)
  }
}
