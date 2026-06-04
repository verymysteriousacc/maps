const express = require("express");
const { Pool } = require("pg");

const app = express();

console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect()
    .then(client => {
        console.log("PostgreSQL Connected");
        client.release();
    })
    .catch(err => {
        console.error("PostgreSQL Connection Error");
        console.error(err);
    });

app.get("/", (req, res) => {
    res.send("RetroAI Test");
});

app.listen(process.env.PORT || 3000);
