
import pg from "pg";
import fs from "fs";

const password = "npg_8b9rEgVjfJkq";
const hostDirect = "ep-twilight-sea-ahbj0vo2.c-3.us-east-1.aws.neon.tech";
const project = "ep-twilight-sea-ahbj0vo2";
const user = "neondb_owner";
const database = "neondb";

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync("db-test-results-v2.txt", msg + "\n");
}

async function testConnection(label: string, connectionString: string) {
    log(`\n--- Testing: ${label} ---`);
    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        const client = await pool.connect();
        log(`✅ SUCCESS: ${label}`);
        const res = await client.query('SELECT current_database(), current_user, version()');
        log(`Details: ${JSON.stringify(res.rows[0])}`);
        client.release();
    } catch (err: any) {
        log(`❌ FAILED: ${label}`);
        log(`Error code: ${err.code || 'None'}`);
        log(`Message: ${err.message}`);
    } finally {
        await pool.end();
    }
}

async function run() {
    if (fs.existsSync("db-test-results-v2.txt")) {
        fs.unlinkSync("db-test-results-v2.txt");
    }

    // 1. Direct host with provided password
    await testConnection("Direct Host + Password", `postgresql://${user}:${password}@${hostDirect}/${database}?sslmode=require`);

    // 2. Direct host WITHOUT password (user said passwordless)
    await testConnection("Direct Host (Passwordless?)", `postgresql://${user}@${hostDirect}/${database}?sslmode=require`);

    // 3. SNI host with user$project pattern NO password
    await testConnection("pg.neon.tech (user$project, Passwordless?)", `postgresql://${user}$${project}@pg.neon.tech/${database}?sslmode=require`);

    // 4. SNI host with user$project pattern + user-provided password
    await testConnection("pg.neon.tech (user$project + Password)", `postgresql://${user}$${project}:${password}@pg.neon.tech/${database}?sslmode=require`);

    // 5. Try with neondb_owner as project too?
    await testConnection("pg.neon.tech (project only as user?)", `postgresql://${project}:${password}@pg.neon.tech/${database}?sslmode=require`);
}

run();
