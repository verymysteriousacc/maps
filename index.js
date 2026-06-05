const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const crypto = require("crypto");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

(async () => {
    try {
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
        console.error(err);
    }
})();

app.get("/", (req, res) => {
    res.json({
        name: "RetroAI",
        status: "online"
    });
});

app.post("/new-chat", async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId required"
            });
        }

        const conversationId = crypto.randomUUID();

        await pool.query(
            "INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3)",
            [conversationId, userId, "New Chat"]
        );

        res.json({
            conversationId,
            title: "New Chat"
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.get("/conversations/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            "SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`RetroAI running on port ${PORT}`);
});
