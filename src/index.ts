import { buildServer } from './server';

const server = await buildServer();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

await server.listen({ port, host });
console.log(`mailmcp server listening on ${host}:${port}`);
