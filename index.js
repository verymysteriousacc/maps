const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

app.post("/geo", async (req, res) => {
    const q = req.body.q;

    if (!q) return res.status(400).json({ error: "missing q" });

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "RobloxOSMProject"
        }
    });

    const data = await response.json();

    res.json(data.map(p => ({
        name: p.display_name,
        lat: Number(p.lat),
        lon: Number(p.lon)
    })));
});

app.get("/tile", async (req, res) => {
    try {
        const { z, x, y } = req.query;

        const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const buffer = await response.arrayBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).send("error");
    }
});

app.listen(process.env.PORT || 3000);
