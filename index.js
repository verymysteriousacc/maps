const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

console.log("DATABASE_URL:", !!process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

(async () => {
    try {
        await pool.query("SELECT NOW()");

        console.log("PostgreSQL Connected");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id BIGSERIAL PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Tables Ready");
    } catch (err) {
        console.error("PostgreSQL Error");
        console.error(err);
    }
})();

app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            name: "RetroAI",
            status: "online",
            database: "connected",
            time: result.rows[0].now
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`RetroAI running on port ${PORT}`);
});
