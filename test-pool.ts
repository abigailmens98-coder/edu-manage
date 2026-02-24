import 'dotenv/config';
import { pool } from './server/storage';

async function test() {
    if (!pool) {
        console.log('Pool is NULL');
        return;
    }
    try {
        const res = await pool.query('SELECT 1');
        console.log('Pool connection SUCCESS:', res.rows);
    } catch (err) {
        console.error('Pool connection FAILED:', err);
    } finally {
        await pool.end();
    }
}

test().catch(console.error);
