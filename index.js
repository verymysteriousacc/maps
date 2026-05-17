const express = require("express")
const cors = require("cors")
const ping = require("ping")

const app = express()

app.use(cors())
app.use(express.json())

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

async function httpPing(host) {
    const start = Date.now()

    try {
        const res = await fetch(`https://${host}`, {
            method: "GET"
        })

        const end = Date.now()

        return {
            ok: true,
            time: end - start,
            status: res.status
        }
    } catch {
        return {
            ok: false,
            time: null,
            status: null
        }
    }
}

app.post("/cli", async (req, res) => {
    const args = parseCommand(req.body.command || "")
    const cmd = (args[0] || "").toLowerCase()
    const host = normalizeTarget(args[1])

    let output = []

    if (cmd === "ping") {
        if (!host) {
            return res.json({ output: ["ERROR: missing target"] })
        }

        let useHttp = false

        output.push(`PING ${host} (HYBRID MODE)`)
        output.push("")

        // 1. TRY ICMP FIRST
        try {
            const icmp = await ping.promise.probe(host, {
                timeout: 2
            })

            if (icmp && icmp.alive) {
                output.push(`ICMP Reply: time=${icmp.time}ms`)
            } else {
                useHttp = true
            }
        } catch {
            useHttp = true
        }

        // 2. FALLBACK HTTP
        if (useHttp) {
            const http = await httpPing(host)

            if (http.ok) {
                output.push(`HTTP Reply: time=${http.time}ms`)
                output.push(`STATUS: ${http.status}`)
            } else {
                output.push("REQUEST FAILED (ICMP + HTTP)")
            }
        }
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
    console.log("Hybrid CLI running")
})
