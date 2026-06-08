import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import indexRoutes from './routes/index.js';
import wikiRoutes from './routes/wiki.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = path.join(publicDir, 'index.html');

const app = express();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.use(express.json());
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(indexHtml);
});

app.use('/', indexRoutes);
app.use('/api/wiki', wikiRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, host, () => {
  console.log(`Sanctum site listening on http://${host}:${port}`);
  console.log(`Serving static files from ${publicDir}`);
});
