const express = require("express")
const cors = require("cors")
const ping = require("ping")

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

function isIP(host) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
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

    if (!rateMap[ip]) rateMap[ip] = []

    rateMap[ip] = rateMap[ip].filter(t => now - t < 5000)

    if (rateMap[ip].length >= 5) return false

    rateMap[ip].push(now)
    return true
}

async function httpPing(host) {
    const start = Date.now()

    try {
        const res = await fetch(`https://${host}`)
        const end = Date.now()

        return {
            ok: true,
            time: end - start,
            status: res.status
        }
    } catch {
        return { ok: false }
    }
}

app.post("/cli", async (req, res) => {
    const ip = req.ip || "global"

    if (!rateLimit(ip)) {
        return res.json({ output: ["ERROR: rate limited"] })
    }

    const args = parseCommand(req.body.command || "")
    const cmd = (args[0] || "").toLowerCase()
    const host = normalizeTarget(args[1])

    let output = []

    if (cmd === "ping") {
        if (!isValidHost(host)) {
            return res.json({ output: ["ERROR: invalid host"] })
        }

        if (isPrivateIP(host)) {
            return res.json({ output: ["ERROR: blocked IP range"] })
        }

        let count = 4

        for (let i = 0; i < args.length; i++) {
            if (args[i] === "--count") {
                count = parseInt(args[i + 1]) || 4
            }
        }

        output.push(`PING ${host} (AUTO MODE)`)
        output.push("")

        let total = 0
        let success = 0
        let usedHttpFallback = false
        let icmpFailed = false

        for (let i = 0; i < count; i++) {
            try {
                const icmp = await ping.promise.probe(host, { timeout: 2 })

                if (icmp.alive) {
                    const t = parseFloat(icmp.time) || 0
                    output.push(`ICMP Reply: time=${t}ms`)
                    total += t
                    success++
                } else {
                    icmpFailed = true

                    const http = await httpPing(host)

                    if (http.ok) {
                        usedHttpFallback = true
                        output.push(`HTTP Reply: time=${http.time}ms status=${http.status}`)
                        total += http.time
                        success++
                    } else {
                        output.push("Request timed out")
                    }
                }
            } catch (e) {
                icmpFailed = true

                const http = await httpPing(host)

                if (http.ok) {
                    usedHttpFallback = true
                    output.push(`HTTP Reply: time=${http.time}ms status=${http.status}`)
                    total += http.time
                    success++
                } else {
                    output.push("Request failed")
                }
            }
        }

        const avg = success ? (total / success).toFixed(2) : 0
        const loss = ((count - success) / count) * 100

        output.push("")

        if (icmpFailed && usedHttpFallback) {
            output.push("MODE: ICMP FAILED → HTTP FALLBACK USED")
        } else if (!icmpFailed) {
            output.push("MODE: ICMP SUCCESS")
        } else {
            output.push("MODE: FULL FAILURE")
        }

        output.push(`Packets: Sent=${count}, Received=${success}, Loss=${loss}%`)
        output.push(`Average latency: ${avg}ms`)
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

    else if (cmd === "fetch") {
        try {
            const r = await fetch(`https://${host}`)
            const text = await r.text()

            output.push(`FETCH ${host}`)
            output.push(`STATUS: ${r.status}`)
            output.push(text.substring(0, 2000))
        } catch {
            output.push("FETCH FAILED")
        }
    }

    else {
        output.push("UNKNOWN COMMAND")
    }

    res.json({ output })
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Auto-Fallback CLI Running")
})
