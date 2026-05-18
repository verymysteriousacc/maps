const express = require("express")
const cors = require("cors")
const ping = require("ping")
const fetch = require("node-fetch")

const app = express()

app.use(cors())
app.use(express.json())

const rateMap = {}

function parseCommand(input) {
    return input.trim().split(/\s+/)
}

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
        host === "localhost"
    )
}

function isValidHost(host) {
    if (!host) return false
    if (host.includes("..")) return false
    if (host.includes(" ")) return false
    if (host.length > 253) return false

    return /^[a-zA-Z0-9.-]+$/.test(host)
}

function rateLimit(ip) {
    const now = Date.now()

    if (!rateMap[ip]) {
        rateMap[ip] = []
    }

    rateMap[ip] = rateMap[ip].filter(t => now - t < 5000)

    if (rateMap[ip].length >= 5) {
        return false
    }

    rateMap[ip].push(now)
    return true
}

async function httpPing(host, size = 32) {
    const payload = "x".repeat(Math.min(size, 2048))

    const start = Date.now()

    try {
        const res = await fetch(`https://${host}`, {
            method: "POST",
            body: payload
        })

        const end = Date.now()

        return {
            ok: true,
            time: end - start,
            status: res.status,
            sizeUsed: payload.length
        }
    } catch {
        return {
            ok: false
        }
    }
}

app.post("/cli", async (req, res) => {
    const ip = req.ip || "global"

    if (!rateLimit(ip)) {
        return res.json({ output: ["ERROR: rate limit exceeded"] })
    }

    const args = parseCommand(req.body.command || "")
    const cmd = (args[0] || "").toLowerCase()
    const host = normalizeTarget(args[1])

    let size = 32
    let loop = 1

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--size") {
            size = parseInt(args[i + 1])
        }

        if (args[i] === "--loop") {
            loop = parseInt(args[i + 1])
        }
    }

    if (isNaN(size)) size = 32
    if (size < 16) size = 16
    if (size > 4096) size = 4096

    if (isNaN(loop)) loop = 1
    if (loop < 1) loop = 1
    if (loop > 50) loop = 50

    let output = []

    if (cmd === "ping") {
        if (!isValidHost(host)) {
            return res.json({ output: ["ERROR: invalid host"] })
        }

        if (isPrivateIP(host)) {
            return res.json({ output: ["ERROR: blocked IP range"] })
        }

        output.push(`LIVE PING START ${host}`)
        output.push(`SIZE=${size} LOOP=${loop}`)
        output.push("")

        let success = 0
        let total = 0

        for (let i = 0; i < loop; i++) {
            await new Promise(r => setTimeout(r, 300))

            let usedHttp = false
            let line = ""

            try {
                const icmp = await ping.promise.probe(host, { timeout: 2 })

                if (icmp.alive) {
                    const t = parseFloat(icmp.time) || 0
                    line = `[${i + 1}] ICMP ${t}ms`
                    success++
                    total += t
                } else {
                    usedHttp = true
                }
            } catch {
                usedHttp = true
            }

            if (usedHttp) {
                const http = await httpPing(host, size)

                if (http.ok) {
                    line = `[${i + 1}] HTTP ${http.time}ms`
                    success++
                    total += http.time
                } else {
                    line = `[${i + 1}] REQUEST FAILED`
                }
            }

            output.push(line)
        }

        output.push("")
        output.push(`Average latency: ${success ? (total / success).toFixed(2) : 0}ms`)
    }

    else if (cmd === "trace") {
        output.push(`TRACE ${host}`)
        output.push("1 Client")
        output.push("2 Network Layer")
        output.push(`3 ${host}`)
        output.push("TRACE COMPLETE")
    }

    else if (cmd === "echo") {
        output.push(args.slice(1).join(" "))
    }

    else {
        output.push("UNKNOWN COMMAND")
    }

    res.json({ output })
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Hybrid Engine Running")
})
