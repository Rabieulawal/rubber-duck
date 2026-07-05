const msgDisplay = document.getElementById("msgdisplay");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

const CONFIG = {
    apiKey: localStorage.getItem("apiKey") || "",
    model: localStorage.getItem("selectedModel") || "default-duck-model",
};

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
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const duckPhrases = [
        "Quack! Have you checked if you declared that variable properly?",
        "Interesting... What happens if you try to console.log that specific object?",
        "Quack! Is there a typo in your class name or ID selector?",
        "Tell me more about what that function is *supposed* to do.",
        "Quack! Did you remember to return the value at the end of the block?"
    ];
    
    return duckPhrases[Math.floor(Math.random() * duckPhrases.length)];
}

sendBtn.onclick = async function() {
    const textTyped = userInput.value.trim();
    if (textTyped === "") return;

    appendMessage(textTyped, "user");
    userInput.value = "";

    const duckResponse = await getDuckReply(textTyped);
    appendMessage(duckResponse, "ai");
};

userInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendBtn.click();
    }
});