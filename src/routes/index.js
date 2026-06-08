import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/health', async (_req, res) => {
  let db = 'disconnected';

  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    db = 'connected';
  } catch {
    db = 'error';
  }

  res.json({
    status: 'ok',
    database: db,
    timestamp: new Date().toISOString(),
  });
});

export default router;
