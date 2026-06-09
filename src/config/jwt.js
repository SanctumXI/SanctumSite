import { getSessionSecret } from './auth.js';

const DEFAULT_ACCESS_TTL_SEC = 60 * 60;
const DEFAULT_REFRESH_TTL_SEC = 60 * 60 * 24 * 30;

export function getJwtConfig() {
  return {
    secret: process.env.JWT_SECRET ?? getSessionSecret(),
    issuer: 'sanctum-site',
    audience: 'sanctum-api',
    accessTtlSec: Number(process.env.JWT_ACCESS_TTL_SEC ?? DEFAULT_ACCESS_TTL_SEC),
    refreshTtlSec: Number(process.env.JWT_REFRESH_TTL_SEC ?? DEFAULT_REFRESH_TTL_SEC),
  };
}
