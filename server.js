import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

const app = express();

const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
]);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS blocked for origin: ${origin}`));
            }
        },
    })
);
app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
    try {
        const { apiKey, model, input, max_output_tokens } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: "Missing API key" });
        }

        const response = await fetch("https://ai.hackclub.com/proxy/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model, input, max_output_tokens }),
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).json({ error: "Proxy request failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Also available at http://127.0.0.1:${PORT}`);
});
