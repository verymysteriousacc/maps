const express = require("express");
const { Pool } = require("pg");

const app = express();

console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("DATABASE_PUBLIC_URL:", process.env.DATABASE_PUBLIC_URL);

const connectionString =
    process.env.DATABASE_URL ||
    process.env.DATABASE_PUBLIC_URL;

console.log("Using connection string:", !!connectionString);

if (connectionString) {
    const pool = new Pool({
        connectionString
    });

    pool.connect()
        .then(client => {
            console.log("PostgreSQL Connected");
            client.release();
        })
        .catch(err => {
            console.error("PostgreSQL Connection Error");
            console.error(err);
        });
} else {
    console.error("No database URL found");
}

app.get("/", (req, res) => {
    res.json({
        databaseUrl: !!process.env.DATABASE_URL,
        databasePublicUrl: !!process.env.DATABASE_PUBLIC_URL
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("RetroAI Test Running");
});
