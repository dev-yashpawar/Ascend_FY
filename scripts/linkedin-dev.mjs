import http from 'node:http';
import { createHandler } from '../server/linkedin/handler.mjs';
try {
  process.loadEnvFile('.env.local');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
http
  .createServer(createHandler())
  .listen(3001, '127.0.0.1', () =>
    console.log('Ascend sharing API: http://127.0.0.1:3001 (Vite proxies /api/linkedin)'),
  );
