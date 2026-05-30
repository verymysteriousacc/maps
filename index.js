const express = require("express")
const cors = require("cors")
const ping = require("ping")

const app = express()

app.use(cors())
app.use(express.json())

const rateMap = {}

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
		host.startsWith("localhost")
	)
}

function isValidHost(host) {

	if (!host) return false

	if (host.includes(" ")) return false
	if (host.includes("..")) return false
	if (host.length > 253) return false

	return /^[a-zA-Z0-9.-]+$/.test(host)
}

function rateLimit(ip) {

	const now = Date.now()

	if (!rateMap[ip]) {
		rateMap[ip] = []
	}

	rateMap[ip] =
		rateMap[ip].filter(
			t => now - t < 10000
		)

	if (rateMap[ip].length >= 5) {
		return false
	}

	rateMap[ip].push(now)

	return true
}

app.get("/", (req, res) => {

	res.send("Online Host")
})

app.get("/console", async (req, res) => {

	const ip = req.ip || "global"

	if (!rateLimit(ip)) {

		return res.json({
			error: "RATE LIMIT EXCEEDED"
		})
	}

	const cmd =
		(req.query.cmd || "")
		.toLowerCase()

	const rawTarget =
		req.query.target ||
		"google.com"

	const target =
		normalizeTarget(rawTarget)

	if (cmd === "help") {

		return res.json({
			output: [
				"COMMANDS",
				"",
				"ping",
				"help"
			]
		})
	}

	if (cmd === "ping") {

		if (!isValidHost(target)) {

			return res.json({
				error: "INVALID HOST"
			})
		}

		if (isPrivateIP(target)) {

			return res.json({
				error: "BLOCKED TARGET"
			})
		}

		try {

			const result =
				await ping.promise.probe(
					target,
					{
						timeout: 2,
						extra: [
							"-c",
							"1"
						]
					}
				)

			return res.json({

				type: "PING",

				host: target,

				alive: result.alive,

				time: result.time,

				output: [

					"PING " + target,

					"",

					"Alive: " +
					result.alive,

					"Latency: " +
					result.time +
					"ms",

					"Mode: ICMP"
				]
			})

		} catch (err) {

			return res.json({
				error: String(err)
			})
		}
	}

	res.json({
		error: "UNKNOWN COMMAND"
	})
})

app.listen(process.env.PORT || 3000, () => {

	console.log(
		"Console Running On Port 8080 Success"
	)
})
