import express from 'express';
import 'dotenv/config';
import indexRoutes from './routes/index.js';
import wikiRoutes from './routes/wiki.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(express.static('public'));

app.use('/', indexRoutes);
app.use('/api/wiki', wikiRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Sanctum site listening on http://localhost:${port}`);
});
