import 'dotenv/config';
import { pool } from './server/storage';

async function listTables() {
    if (!pool) {
        console.log('Pool is NULL');
        return;
    }
    try {
        const res = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('Tables:', res.rows.map(r => r.tablename));
    } catch (err) {
        console.error('ERROR in query:', err);
    } finally {
        await pool.end();
    }
}

listTables().catch(console.error);
