import express from "express";

const app = express();

app.get("/", (req,res) => {
    res.json({
        message:"api setup"
    })
})

app.listen(8000,() => {
    console.log("server is running")
})