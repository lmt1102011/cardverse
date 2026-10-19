import { buildServer } from './server.js'
import { config } from './config/env.js'

buildServer(config.port, config.host)
  .then(() => {
    console.log(`Server running on http://${config.host}:${config.port}`)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
