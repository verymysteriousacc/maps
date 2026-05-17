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

    target = target.replace(/^https?:\/\//, "")
    target = target.split("/")[0]

    return target
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

app.post("/cli", async (req, res) => {
    const args = parseCommand(req.body.command || "")
    const cmd = (args[0] || "").toLowerCase()
    const rawTarget = args[1]
    const target = normalizeTarget(rawTarget)

    let output = []

    if (cmd === "ping") {

        if (!target) {
            return res.json({ output: ["ERROR: missing target"] })
        }

        if (isPrivateIP(target)) {
            return res.json({ output: ["ERROR: blocked target"] })
        }

        let count = 4

        for (let i = 0; i < args.length; i++) {
            if (args[i] === "--count") {
                count = parseInt(args[i + 1]) || 4
            }
        }

        output.push(`PING ${target} (ICMP SAFE MODE)`)
        output.push("")

        let total = 0
        let success = 0

        for (let i = 0; i < count; i++) {

            try {
                const result = await ping.promise.probe(target, {
                    timeout: 2
                })

                if (result.alive) {
                    output.push(`Reply from ${target}: time=${result.time}ms`)
                    total += parseFloat(result.time)
                    success++
                } else {
                    output.push(`Request timed out.`)
                }

            } catch {
                output.push(`Error reaching host`)
            }
        }

        let loss = ((count - success) / count) * 100
        let avg = success > 0 ? (total / success).toFixed(2) : 0

        output.push("")
        output.push(`Packets: Sent=${count}, Received=${success}, Lost=${count - success} (${loss}%)`)
        output.push(`Average latency: ${avg}ms`)
    }

    else if (cmd === "trace") {
        output.push("TRACE: not ICMP (simulated safe mode)")
        output.push("1 Client")
        output.push("2 Network")
        output.push(`3 ${target}`)
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
    console.log("Safe ICMP CLI running")
})
