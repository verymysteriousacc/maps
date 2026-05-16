const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

app.post("/geo", async (req, res) => {
    try {
        const q = req.body.q;

        if (!q) {
            return res.status(400).json({ error: "Missing query" });
        }

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "RobloxGeoBackend"
            }
        });

        const data = await response.json();

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Geo backend running on port " + PORT);
});
