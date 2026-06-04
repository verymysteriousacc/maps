const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = "openai/gpt-oss-120b:free";

const LIMIT = 10;
const WINDOW_MS = 60000;
const requests = new Map();

function rateLimit(req, res, next) {
const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;
const now = Date.now();

if (!requests.has(ip)) {
requests.set(ip, []);
}

const timestamps = requests.get(ip).filter(t => now - t < WINDOW_MS);

timestamps.push(now);
requests.set(ip, timestamps);

if (timestamps.length > LIMIT) {
return res.status(429).json({
error: "Too many requests"
});
}

next();
}

app.get("/", (req, res) => {
res.json({
name: "RetroAI",
status: "online"
});
});

app.use("/chat", rateLimit);

app.post("/chat", async (req, res) => {
try {
const message = req.body?.message;

if (!message) {
return res.status(400).json({
error: "No message provided"
});
}

if (!process.env.AITOKEN) {
return res.status(500).json({
error: "AITOKEN environment variable not found"
});
}

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${process.env.AITOKEN}`,
"Content-Type": "application/json"
},
body: JSON.stringify({
model: MODEL,
messages: [
{
role: "user",
content: message
}
]
})
});

const data = await response.json();

if (!response.ok) {
return res.status(response.status).json({
error: "OpenRouter request failed",
details: data
});
}

const output = data?.choices?.[0]?.message?.content;

if (!output) {
return res.status(500).json({
error: "No content returned",
details: data
});
}

res.json({
response: output
});

} catch (err) {
res.status(500).json({
error: err.message,
stack: err.stack
});
}
});

app.listen(PORT, () => {
console.log(`RetroAI running on port ${PORT}`);
});
