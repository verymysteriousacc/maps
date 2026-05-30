const express = require("express")
const cors = require("cors")
const ping = require("ping")
const fetch = require("node-fetch")
const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
	res.send("Host Online")
})

app.get("/console", async (req, res) =>
{
	const cmd = (req.query.cmd || "").toLowerCase()
	const target = req.query.target

