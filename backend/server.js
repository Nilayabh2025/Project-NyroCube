const { createServer } = require('http');
const { buildApp } = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const { createSocketServer } = require('./src/websocket/socketServer');
const env = require('./src/config/env');

async function bootstrap() {
  const db = await connectDatabase();
  const app = buildApp(db);
  const server = createServer(app);
  const io = createSocketServer(server, db);

  app.set('io', io);
  app.set('db', db);

  server.listen(env.port, () => {
    console.log(`NyroCube backend listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start NyroCube backend:', error);
  process.exit(1);
});
