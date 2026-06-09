import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getJwtConfig } from '../../config/jwt.js';

function secretKey() {
  const { secret } = getJwtConfig();
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(sessionUser) {
  const { issuer, audience, accessTtlSec } = getJwtConfig();

  return new SignJWT({
    user: sessionUser,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sessionUser.id)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${accessTtlSec}s`)
    .sign(secretKey());
}

export async function verifyAccessToken(token) {
  const { issuer, audience } = getJwtConfig();
  const { payload } = await jwtVerify(token, secretKey(), {
    issuer,
    audience,
  });

  return {
    discordId: payload.sub,
    user: payload.user,
  };
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
