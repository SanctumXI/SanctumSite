import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import { getSessionSecret } from './auth.js';

const require = createRequire(import.meta.url);
const FileStore = require('session-file-store')(session);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionDir = path.join(__dirname, '..', '..', 'data', 'sessions');
const isProduction = process.env.NODE_ENV === 'production';
const oneWeekMs = 1000 * 60 * 60 * 24 * 7;

export function createSessionMiddleware() {
  return session({
    name: 'sanctum.sid',
    secret: getSessionSecret(),
    store: new FileStore({
      path: sessionDir,
      ttl: oneWeekMs / 1000,
      retries: 0,
      logFn: () => {},
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: oneWeekMs,
    },
  });
}
