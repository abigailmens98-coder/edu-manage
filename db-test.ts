import pg from "pg";
import "dotenv/config";
import dns from "dns";
import net from "net";
import { URL } from "url";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
}

try {
    const dbUrl = new URL(connectionString);
    const hostname = dbUrl.hostname;
    const port = parseInt(dbUrl.port || "5432");

    console.log(`Target: ${hostname}:${port}`);

    // Test 1: DNS Lookup
    console.log("1. Testing DNS lookup...");
    dns.lookup(hostname, (err, address, family) => {
        if (err) {
            console.error("❌ DNS Lookup failed:", err);
            process.exit(1);
        }
        console.log(`✅ DNS Lookup success: ${address} (IPv${family})`);

        // Test 2: TCP Connection
        console.log("2. Testing TCP connection...");
        const socket = net.createConnection(port, hostname);

        socket.on("connect", () => {
            console.log("✅ TCP Connection success!");
            socket.end();

            // Test 3: PG Connection
            console.log("3. Testing PG Connection...");
            testPgConnection();
        });

        socket.on("error", (err) => {
            console.error("❌ TCP Connection failed:", err);
        });

        socket.setTimeout(5000, () => {
            console.error("❌ TCP Connection timed out");
            socket.destroy();
        });
    });

} catch (e) {
    console.error("Invalid DATABASE_URL:", e.message);
}

function testPgConnection() {
    const { Pool } = pg;
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    pool.connect().then(client => {
        console.log("✅ PG Pool Connection success!");
        client.release();
        pool.end();
    }).catch(err => {
        console.error("❌ PG Pool Connection failed:", err.message);
        pool.end();
    });
}
