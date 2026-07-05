export default async function handler(req, res) {
    // CORS headers
    const origin = req.headers.origin || "";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
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
        return res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy error:", err);
        return res.status(500).json({ error: "Proxy request failed" });
    }
}
