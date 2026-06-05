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

app.get("/history/:conversationId", async (req, res) => {
    try {
        const { conversationId } = req.params;

        const result = await pool.query(
            "SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
            [conversationId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
