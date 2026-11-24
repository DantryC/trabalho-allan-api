const { app } = require('./app');
const { db } = require('./database/connection');
const { env, validateEnvironment } = require('./config/environment');
const { ensureFirstAdministrator } = require('./seed/first-administrator');
require('./database/models');

async function start() {
  validateEnvironment();
  await db.authenticate();
  await db.sync();
  await ensureFirstAdministrator();
  const server = app.listen(env.port, () => console.log(`Acervo Campus disponível em http://localhost:${env.port}`));
  const shutdown = async () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Falha ao iniciar a API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { start };
