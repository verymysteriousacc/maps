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

function isValidHost(host) {
    if (!host) return false
    if (host.includes("..")) return false
    if (host.includes(" ")) return false
    if (host.length > 253) return false

    const domainRegex = /^[a-zA-Z0-9.-]+$/
    return domainRegex.test(host)
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

async function httpPing(host) {
    const start = Date.now()

    try {
        const res = await fetch(`https://${host}`, { method: "GET" })
        const end = Date.now()

        return {
            ok: true,
            time: end - start,
            status: res.status
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

        output.push(`PING ${host} (HYBRID SAFE MODE)`)
        output.push("")

        let success = 0
        let total = 0
        let useHttp = false

        try {
            const icmp = await ping.promise.probe(host, { timeout: 2 })

            if (icmp && icmp.alive) {
                const t = parseFloat(icmp.time) || 0
                output.push(`ICMP Reply: time=${t}ms`)
                success++
                total += t
            } else {
                useHttp = true
            }
        } catch {
            useHttp = true
        }

        if (useHttp) {
            const http = await httpPing(host)

            if (http.ok) {
                output.push(`HTTP Reply: time=${http.time}ms`)
                output.push(`STATUS: ${http.status}`)
                success++
                total += http.time
            } else {
                output.push("REQUEST FAILED")
            }
        }

        output.push("")
        output.push(`Average latency: ${success ? (total / success).toFixed(2) : 0}ms`)
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

        if (isPrivateIP(host)) {
            return res.json({ output: ["ERROR: blocked IP range"] })
        }

        try {
            const resFetch = await fetch(`https://${host}`)
            const text = await resFetch.text()

            output.push(`FETCH ${host}`)
            output.push(`STATUS: ${resFetch.status}`)
            output.push("")
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
    console.log("Secure Hybrid CLI running")
})
