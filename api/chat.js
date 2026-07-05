export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

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
}
