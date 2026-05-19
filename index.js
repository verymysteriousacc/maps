const express = require("express")
const cors = require("cors")
const fs = require("fs")

const app = express()

app.use(cors())
app.use(express.json())

const maps = {
	city: {
		image: "city.png",
		description: "Main City Railway"
	},

	metro: {
		image: "metro.png",
		description: "Metro System"
	},

	japan: {
		image: "japan.png",
		description: "Japan Railway"
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
	}
]

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

app.listen(process.env.PORT || 3000, () => {
	console.log("Console Running On Port 8080 Success")
})
