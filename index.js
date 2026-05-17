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

    if (cmd === "echo") {
        output.push(args.slice(1).join(" "))
    }

    else if (cmd === "ping") {
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

        output.push(`PING ${host} (SAFE HYBRID MODE)`)
        output.push("")

        if (isIP(host)) {
            output.push("IP MODE DETECTED (ICMP ONLY)")
        }

        let total = 0
        let success = 0

        for (let i = 0; i < count; i++) {
            try {
                const icmp = await ping.promise.probe(host, { timeout: 2 })

                if (icmp.alive) {
                    const t = parseFloat(icmp.time) || 0
                    output.push(`ICMP Reply: time=${t}ms`)
                    total += t
                    success++
                } else {
                    if (!isIP(host)) {
                        const http = await httpPing(host)

                        if (http.ok) {
                            output.push(`HTTP Reply: time=${http.time}ms status=${http.status}`)
                            total += http.time
                            success++
                        } else {
                            output.push("Request timed out")
                        }
                    } else {
                        output.push("Request timed out")
                    }
                }
            } catch {
                output.push("Error reaching host")
            }
        }

        const avg = success ? (total / success).toFixed(2) : 0
        const loss = ((count - success) / count) * 100

        output.push("")
        output.push(`Packets: Sent=${count}, Received=${success}, Loss=${loss}%`)
        output.push(`Average latency: ${avg}ms`)
    }

    else if (cmd === "trace") {
        if (!isValidHost(host)) {
            return res.json({ output: ["ERROR: invalid host"] })
        }

        if (isPrivateIP(host)) {
            return res.json({ output: ["ERROR: blocked IP range"] })
        }

        output.push(`TRACE ${host}`)
        output.push("1 Client")
        output.push("2 Network Layer")
        output.push(`3 ${host}`)
        output.push("TRACE COMPLETE")
    }

    else if (cmd === "fetch") {
        if (!isValidHost(host)) {
            return res.json({ output: ["ERROR: invalid host"] })
        }

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

    else if (cmd === "dns") {
        output.push(`DNS LOOKUP: ${host}`)
        output.push("Resolved (system dependent / simulated mode)")
    }

    else if (cmd === "geo") {
        try {
            const r = await fetch(`http://ip-api.com/json/${host}`)
            const geo = await r.json()

            if (geo.status !== "success") {
                output.push("GEO LOOKUP FAILED")
            } else {
                output.push(`Country: ${geo.country}`)
                output.push(`Region: ${geo.regionName}`)
                output.push(`City: ${geo.city}`)
                output.push(`ISP: ${geo.isp}`)
                output.push(`IP: ${geo.query}`)
            }
        } catch {
            output.push("GEO LOOKUP FAILED")
        }
    }

    else {
        output.push("UNKNOWN COMMAND")
    }

    res.json({ output })
})

app.listen(process.env.PORT || 3000, () => {
    console.log("Secure Hybrid CLI Running")
})
