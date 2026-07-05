const API_PORT = 3001;
const isLocalLiveServer =
    (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1") &&
    window.location.port !== "" &&
    window.location.port !== String(API_PORT);

const ENDPOINT = isLocalLiveServer
    ? `http://localhost:${API_PORT}/api/chat`
    : "/api/chat";

const msgDisplay = document.getElementById("msgdisplay");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const apiKey = document.getElementById("apiKey");
const apiBtn = document.getElementById("apiBtn");

const model = document.getElementById("modelBox");
const modelBtn = document.getElementById("modelBtn");

const isapiset = document.getElementById("isapiset");

const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

const SYSTEM_PROMPT =
    "You are a friendly rubber duck debugging assistant. Ask clarifying " +
    "questions and help the user think through their code, like a classic " +
    "'rubber duck debugging' partner. Keep responses concise. Remember the " +
    "context of the whole conversation as you help the user.";

// ====== SETTINGS PAGE LOGIC ======

if (apiBtn) {
    apiBtn.onclick = function () {
        const keyFromBox = apiKey.value.trim();
        if (keyFromBox === "") return;
        localStorage.setItem("apiKey", keyFromBox);
        apiKey.value = "";
        updateApiStatus();
    };
}

if (modelBtn) {
    modelBtn.onclick = function () {
        const modelFromBox = model.value.trim();
        if (modelFromBox === "") return;
        localStorage.setItem("selectedModel", modelFromBox);
        model.value = "";
        updateApiStatus();
    };
}

function updateApiStatus() {
    if (!isapiset) return;
    const keySet = !!localStorage.getItem("apiKey");
    const currentModel = localStorage.getItem("selectedModel") || DEFAULT_MODEL;
    isapiset.textContent = keySet
        ? `API key saved ✅ | Model: ${currentModel}`
        : `No API key set ❌ | Model: ${currentModel}`;
}

updateApiStatus();

// ====== SHARED CONFIG ======

function getConfig() {
    return {
        apiKey: localStorage.getItem("apiKey") || "",
        model: localStorage.getItem("selectedModel") || DEFAULT_MODEL,
    };
}

// ====== CONVERSATION HISTORY (Responses API format) ======
let conversationHistory = [
    {
        type: "message",
        role: "system",
        content: [
            {
                type: "input_text",
                text: SYSTEM_PROMPT,
            },
        ],
    },
];

// ====== CHAT PAGE LOGIC ======

function appendMessage(text, sender) {
    const newMsgDiv = document.createElement("div");
    newMsgDiv.classList.add("msg", sender === "user" ? "usermsg" : "aimsg");

    const msgParagraph = document.createElement("p");
    msgParagraph.textContent = text;

    newMsgDiv.appendChild(msgParagraph);
    msgDisplay.appendChild(newMsgDiv);

    msgDisplay.scrollTop = msgDisplay.scrollHeight;
}

async function getDuckReply(userMessage) {
    const { apiKey, model } = getConfig();

    if (!apiKey) {
        return "Quack! I need an API key first — head to settings and save one.";
    }

    conversationHistory.push({
        type: "message",
        role: "user",
        content: [
            {
                type: "input_text",
                text: userMessage,
            },
        ],
    });

    try {
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey: apiKey,
                model: model,
                input: conversationHistory,
                max_output_tokens: 9000,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("API error:", response.status, errText);
            conversationHistory.pop();
            return `Quack... something went wrong (status ${response.status}). Check your API key/model in settings.`;
        }

        const data = await response.json();

        // Responses API shape: data.output is an array of message objects,
        // each with a content array containing output_text blocks.
        const reply = data?.output?.[0]?.content?.find(
            (block) => block.type === "output_text"
        )?.text;

        if (!reply) {
            conversationHistory.pop();
            console.warn("Unexpected response shape:", data);
            return "Quack? I got an empty response — try again.";
        }

        conversationHistory.push({
            type: "message",
            role: "assistant",
            content: [
                {
                    type: "output_text",
                    text: reply,
                },
            ],
        });

        return reply;
    } catch (err) {
        console.error("Fetch failed:", err);
        conversationHistory.pop();
        return "Quack! I couldn't reach the server. Check your internet connection or endpoint.";
    }
}

if (sendBtn) {
    sendBtn.onclick = async function () {
        const textTyped = userInput.value.trim();
        if (textTyped === "") return;

        appendMessage(textTyped, "user");
        userInput.value = "";

        const duckResponse = await getDuckReply(textTyped);
        appendMessage(duckResponse, "ai");
    };
}

if (userInput) {
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendBtn.click();
        }
    });
}
