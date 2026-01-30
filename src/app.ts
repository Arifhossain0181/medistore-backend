import express from "express"

const app = express();

app.use(express.json());

// Define your routes here
app.get("/", (req, res) => {
    res.send("Welcome to the Medical Backend API");
});

export default app;