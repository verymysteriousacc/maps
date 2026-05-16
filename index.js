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

        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "RobloxGeoBackend"
            }
        });

        const data = await response.json();

        const results = data.map(item => ({
            name: item.display_name,
            lat: item.lat,
            lon: item.lon
        }));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on " + PORT);
});
