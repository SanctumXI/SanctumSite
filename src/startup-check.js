import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

export function ensureRuntimeDirs() {
  const dirs = [
    path.join(projectRoot, 'data', 'sessions'),
    path.join(projectRoot, 'data', 'profiles'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function validateStartup() {
  const envPath = path.join(projectRoot, '.env');
  const zonesPath = path.join(projectRoot, 'data', 'zones.json');
  const isProduction = process.env.NODE_ENV === 'production';
  const issues = [];

  if (!fs.existsSync(envPath)) {
    issues.push(`.env file not found at ${envPath}`);
  }

  if (!fs.existsSync(zonesPath)) {
    issues.push(`data/zones.json missing — run: npm run zones:generate`);
  }

  if (isProduction && !process.env.SESSION_SECRET) {
    issues.push('SESSION_SECRET is required when NODE_ENV=production');
  }

  if (issues.length) {
    console.error('Startup validation failed:');
    for (const issue of issues) {
      console.error(`  - ${issue}`);
    }
    throw new Error('Server startup checks failed');
  }

  if (isProduction) {
    console.log('Production mode: secure session cookies enabled (requires HTTPS)');
  }
}
