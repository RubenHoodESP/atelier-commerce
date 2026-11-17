import { createProviderApp } from './app.js';
const port = Number(process.env.PROVIDER_PORT ?? 4100);
const server = createProviderApp().listen(port, '127.0.0.1', () => console.log(`Mock provider on ${port}`));
process.once('SIGTERM', () => server.close());
process.once('SIGINT', () => server.close());
