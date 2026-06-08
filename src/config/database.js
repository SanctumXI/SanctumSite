import { createPool } from 'mariadb';
import 'dotenv/config';

function buildPoolConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    charset: 'utf8mb4',
  };

  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
}

const pool = createPool(buildPoolConfig());

export async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;
