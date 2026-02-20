
import pg from "pg";
import fs from "fs";

const password = "npg_4kzVgQ2BaHSn";
const hostDirect = "ep-twilight-sea-ahbj0vo2.us-east-1.aws.neon.tech";
const user = "neondb_owner";
const database = "neondb";

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync("db-test-results.txt", msg + "\n");
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
        log(`Error code: ${err.code}`);
        log(`Message: ${err.message}`);
    } finally {
        await pool.end();
    }
}

async function run() {
    if (fs.existsSync("db-test-results.txt")) {
        fs.unlinkSync("db-test-results.txt");
    }

    // 1. Direct host (Clean)
    await testConnection("Direct Host (Clean)", `postgresql://${user}:${password}@${hostDirect}/${database}?sslmode=require`);

    // 2. pg.neon.tech with user$project pattern
    const project = "ep-twilight-sea-ahbj0vo2";
    await testConnection("pg.neon.tech (user$project)", `postgresql://${user}$${project}:${password}@pg.neon.tech/${database}?sslmode=require`);

    // 3. us-east-1.aws.neon.tech with user$project pattern
    await testConnection("AWS Proxy (user$project)", `postgresql://${user}$${project}:${password}@us-east-1.aws.neon.tech/${database}?sslmode=require`);

    // 4. Try without password (as user suggested "passwordless")
    await testConnection("pg.neon.tech (Passwordless?)", `postgresql://${user}$${project}@pg.neon.tech/${database}?sslmode=require`);
}

run();
