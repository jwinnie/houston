/**
 * flightcheck/interfaces/houston.js
 * Will connect flightcheck to houston for tests
 */

import assert from 'assert'

import Atc from '~/lib/atc'
import config from '~/lib/config'
import log from '~/lib/log'
import Pipeline from '~/flightcheck/pipeline'

const connection = new Atc('flightcheck')
connection.connect(config.server.url)

log.info(`Flightcheck running in ${config.env} configuration`)

connection.on('cycle:queue', async (data) => {
  try {
    assert(data.id, 'Flightcheck needs a database id to run Pipeline')
    assert(data.repo, 'Flightcheck needs a Git repository to run Pipeline')
    assert(data.tag, 'Flightcheck needs a Git tag to run Pipeline')
  } catch (err) {
    log.error('Flightcheck received incorrect or incomplete data from Houston')
    log.error(err)

    connection.send('houston', 'cycle:error', data.id, err)
    return
  }

  let pipeline = null
  try {
    data.changelog = data.changelog.map((c) => {
      c['changes'] = c['changelog']
      return c
    })

    pipeline = new Pipeline(data)
  } catch (err) {
    log.error('Flightcheck received an error while trying to create Pipeline')
    log.error(err)

    connection.send('houston', 'cycle:error', data.id, err)
    return
  }

  log.debug(`Starting flightcheck on ${data.name}`)
  connection.send('houston', 'cycle:start', data.id, true)

  try {
    await pipeline.start()
  } catch (err) {
    log.error('Flightcheck received an error while running Pipeline')
    log.error(err)

    connection.send('houston', 'cycle:error', data.id, err)
    return
  }

  const apphub = pipeline.pipes.find((p) => (p.name === 'AppHub'))
  const aptly = pipeline.pipes.find((p) => (p.name === 'ElementaryAptly'))
  const logs = await pipeline.logs()

  connection.send('houston', 'cycle:finish', data.id, {
    apphub: (apphub != null) ? apphub.data : null,
    aptly: (aptly != null) ? aptly.data : null,
    logs
  })
})