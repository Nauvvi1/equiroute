import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexRouter } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(projectRoot, 'views'));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(projectRoot, 'public')));
app.use(indexRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
