const express = require("express")
const cors = require("cors")
const ping = require("ping")
const fetch = require("node-fetch")
const app = express()

app.use(cors())
app.use(express.json())

const rateMap {}

function normalizeTarget(target) {
	if (!target) return null

	return target
	.trim()
	.replace(/^https?:\/\//, "")
	.split("/")[0]
	.split(":")[0]
}

function isPrivateIP(host) {
	return (
		host.startsWith("127.") ||
		host.startsWith("10.") ||
		host.startsWith("192.168.") ||
		host.startsWith("172.16.") ||
		host.startsWith("localhost") ||
	)
}

function isValidHost(host)
	if (!host) return false

	if (host.includes(" ")) return false
	if (host.includes("..")) return false
	if (host.length > 253) return false

	return /^[a-zA-Z0-9.-]+$/.test(host)
}

app.get("/", (req, res) => {
	res.send("Host Online")
})

app.get("/console", async (req, res) =>
{
	const cmd = (req.query.cmd || "").toLowerCase()
	const target = req.query.target || "google.com"

	if (cmd === "ping") {

		try {
			const result = await ping.promise.probe(target)

			return res.json({
				type: "PING",
				host: target,
				alive: result.alive,
				time: result.time,
				output: [
					"PING " + target,
					"",
					"Alive: " + result.alive,
					"Latency: " + result.time + "ms"
				]
			})

		} catch {
			return res.json({
				error: "Server Contacted Response ERROR CODE:403"
			})
		}
	}

	if (cmd === "fetch") {
		try {
			const response = await fetch("https://" + target)

			return res.json({
				type: "FETCH",
				status: response.status,
				output: [
					"FETCH " + target,
					"",
					"Status: " + response.status
				]
			})

		} catch {
			return res.json({
				error: "Failed To Fetch Resource ERROR CODE: 403"
			})
		}
	}

	if (cmd === "help") {
		return res.json({
			output: [
				"COMMANDS",
				"",
				"ping",
				"fetch",
				"help"
			]
		})
	}

	res.json({
		error: "Runtime Exception Failed To Get Packs ERROR CODE: 403"
	})
})

app.listen(process.env.PORT || 3000, () => {
	console.log("Server PORT: 8080 (Railway)")
})
					

