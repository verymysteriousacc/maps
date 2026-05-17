const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function randomLatency(base = 40) {
    return Math.floor(base + Math.random() * 60)
}

function parseCommand(input) {
    const parts = input.trim().split(/\s+/)
    return parts
}

app.post("/cli", async (req, res) => {
    const commandLine = req.body.command || ""
    const args = parseCommand(commandLine)

    const cmd = args[0]
    const target = args[1]

    let output = []

    if (!cmd) {
        return res.json({ output: ["ERROR: no command provided"] })
    }

    if (cmd === "echo") {
        output.push(args.slice(1).join(" "))
    }

    if (cmd === "ping") {
        let ipv = "IPv4"
        let size = 4

        for (let i = 0; i < args.length; i++) {
            if (args[i] === "--ipv6") ipv = "IPv6"
            if (args[i] === "--ipv4") ipv = "IPv4"
            if (args[i] === "--size") size = parseInt(args[i + 1]) || 4
        }

        const latency = randomLatency(30 + size * 2)

        output.push(`PING ${target} ${ipv} size=${size}`)
        await sleep(100)
        output.push(`Reply from ${target}: time=${latency}ms`)
        output.push(`packet loss: 0%`)
    }

    if (cmd === "trace") {
        output.push(`TRACE ${target}`)
        await sleep(50)
        output.push(`1  Client Node        0ms`)
        output.push(`2  Railway Backend     ${randomLatency(10)}ms`)
        await sleep(50)
        output.push(`3  DNS Resolver       ${randomLatency(20)}ms`)
        await sleep(50)
        output.push(`4  ${target}           ${randomLatency(50)}ms`)
        output.push(`TRACE COMPLETE`)
    }

    if (output.length === 0) {
        output.push("UNKNOWN COMMAND")
    }

    res.json({ output })
})

app.get("/", (req, res) => {
    res.send("Roblox CLI Backend Running")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log("CLI backend running on port " + PORT)
})
