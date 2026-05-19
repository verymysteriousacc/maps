const express = require("express")
const cors = require("cors")
const fs = require("fs")

const app = express()

app.use(cors())
app.use(express.json({ limit: "50mb" }))

const TOKEN = process.env.TOKEN

const OWNER = "verymysteriousacc"
const REPO = "filesys"

const maps = {
	city: {
		image: "city.png",
		description: "Main Railway Map"
	}
}

const stations = [
	{
		name: "Central Station",
		x: 420,
		y: 315
	},

	{
		name: "Airport",
		x: 650,
		y: 220
	},

	{
		name: "North Rail",
		x: 300,
		y: 120
	},

	{
		name: "South Station",
		x: 500,
		y: 520
	}
]

async function updateGitHubMap(localFile) {
	const content = fs.readFileSync(localFile, {
		encoding: "base64"
	})

	const getFile = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/contents/maps/city.png`,
		{
			headers: {
				Authorization: `Bearer ${TOKEN}`,
				"User-Agent": "MapSystem"
			}
		}
	)

	const existingData = await getFile.json()

	const upload = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/contents/maps/city.png`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${TOKEN}`,
				"Content-Type": "application/json",
				"User-Agent": "MapSystem"
			},
			body: JSON.stringify({
				message: "Update city map",
				content: content,
				sha: existingData.sha
			})
		}
	)

	return await upload.json()
}

app.get("/", (req,res) => {
	res.send("Console Running On Port 8080 Success")
})

app.get("/maps", (req,res) => {
	res.json({
		maps
	})
})

app.get("/stations", (req,res) => {
	res.json({
		stations
	})
})

app.get("/search", (req,res) => {
	const q = (req.query.q || "").toLowerCase()

	const found = stations.filter(v =>
		v.name.toLowerCase().includes(q)
	)

	res.json({
		results: found
	})
})

app.get("/map/:name", (req,res) => {
	const map = maps[req.params.name]

	if (!map) {
		return res.json({
			error: "Map Not Found"
		})
	}

	res.json({
		map
	})
})

app.get("/updatemap", async (req,res) => {
	try {
		const result = await updateGitHubMap("./newmap.png")

		res.json({
			success: true,
			result
		})
	}
	catch(err) {
		res.json({
			success: false,
			error: err.message
		})
	}
})

app.listen(process.env.PORT || 3000, () => {
	console.log("Console Running On Port 8080 Success")
})
