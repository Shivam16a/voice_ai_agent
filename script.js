const API_KEY = "AIzaSyBNUYPbF051_GrDCvzcfHGDCpJo-KVLs0I";
const WAKE_WORD = "shivam";
let chatHistory = [];

// ---------------- Speech Recognition ---------------- //
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "hi-IN";
recognition.interimResults = false;

let listening = false;
let stopped = false;
let voicesLoaded = false;

// ---------------- HTML Elements ---------------- //
const listenBtn = document.getElementById("listenBtn");
const stopBtn = document.getElementById("stopBtn");
const autoToggle = document.getElementById("autoToggle");
const chatBox = document.getElementById("chatBox");
const statusEl = document.getElementById("status");
const micPulse = document.getElementById("micPulse");
const showHistoryBtn = document.getElementById("showHistory");
const clearHistoryBtn = document.getElementById("clearHistory");

// -------------- Load Old History ----------------- //
window.onload = () => {
    const saved = localStorage.getItem("shivamAI_history");
    if (saved) {
        chatHistory = JSON.parse(saved);
        chatHistory.forEach(msg => addMsg(msg.text, msg.type));
    }
};

// -------------------- Buttons -------------------- //
listenBtn.onclick = () => {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    stopped = false;
    startMic();
};

stopBtn.onclick = () => {
    stopped = true;
    listening = false;
    recognition.stop();
    micPulse.style.display = "none";
    statusEl.textContent = "Stopped.";
};

showHistoryBtn.onclick = () => {
    console.clear();
    console.log("🔹 Chat History 🔹");
    chatHistory.forEach((msg, i) => 
        console.log(`${i + 1}. [${msg.time}] ${msg.type.toUpperCase()}: ${msg.text}`)
    );
};

clearHistoryBtn.onclick = () => {
    if (confirm("Kya aap sach me pura chat history delete karna chahte hain?")) {
        localStorage.removeItem("shivamAI_history");
        chatHistory = [];
        chatBox.innerHTML = "";
        console.clear();
        alert("Chat history delete ho gayi!");
    }
};

// -------------------- Mic Start ------------------- //
function startMic() {
    if (stopped) return;
    if (listening) return; // FIX: double start block

    listening = true;
    recognition.start();
    micPulse.style.display = "block";
    statusEl.textContent = "Listening...";
}

// ---------------- Speech Recognition Events ---------------- //
recognition.onresult = async (event) => {
    if (stopped) return;

    const text = event.results[0][0].transcript.toLowerCase();
    addMsg(text, "user");

    // Wake word required ONLY in auto-mode
    if (autoToggle.checked && !text.includes(WAKE_WORD)) {
        statusEl.textContent = `Say wake word: "${WAKE_WORD}"...`;
        setTimeout(() => startMic(), 800);
        return;
    }

    statusEl.textContent = "Thinking...";

    const response = await askAI(text);
    addMsg(response, "ai");
    speak(response);

    // Auto re-listen
    if (autoToggle.checked && !stopped) {
        setTimeout(() => startMic(), 1200);
    } else {
        micPulse.style.display = "none";
    }
};

recognition.onend = () => {
    listening = false;
    micPulse.style.display = "none";

    if (autoToggle.checked && !stopped) {
        startMic();
    }
};

// ------------------ AI Function ------------------- //
async function askAI(msg) {

    // Manual quick responses
    if (msg.includes("डेट") || msg.includes("date")) {
        return `आज का डेट: ${getHindiDate()}`;
    }
    if (msg.includes("kisne banaya tumko")) {
        return "मैं एक AI एजेंट हूँ और मुझे शिवम सर ने बनाया है।";
    }

    const body = {
        contents: [
            {
                parts: [
                    {
                        text: `You are Shivam AI, a friendly male Hindi assistant. User: ${msg}`
                    }
                ]
            }
        ]
    };

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            }
        );

        const data = await res.json();

        if (!data.candidates) {
            return "API से डेटा नहीं मिल पाया। कृपया API key चेक करें।";
        }

        return (
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            data.candidates?.[0]?.content?.[0]?.text ||
            "मुझे समझ नहीं आया।"
        );

    } catch (err) {
        console.error(err);
        return "सर्वर से जवाब नहीं मिल सका।";
    }
}

// ------------------ Add Message ------------------- //
function addMsg(text, type) {
    const div = document.createElement("div");
    div.classList.add("message", type);
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    chatHistory.push({ type, text, time: new Date().toLocaleTimeString() });

    // Fix: prevent LocalStorage overflow
    if (chatHistory.length > 200) chatHistory.shift();

    localStorage.setItem("shivamAI_history", JSON.stringify(chatHistory));
}

// ------------------- Male Voice -------------------- //
function getMaleHindiVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
        voices.find(v =>
            v.lang.startsWith("hi") &&
            (v.name.toLowerCase().includes("male") ||
                v.name.toLowerCase().includes("man") ||
                v.name.toLowerCase().includes("boy"))
        ) || voices.find(v => v.lang.startsWith("hi"))
    );
}

// -------------------- Speak ------------------------ //
function speak(text) {
    window.speechSynthesis.cancel();

    // Clean emojis safely
    const cleanText = text.replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, "");

    const msg = new SpeechSynthesisUtterance(cleanText);
    msg.lang = "hi-IN";
    msg.rate = 1;
    msg.pitch = 1;

    const maleVoice = getMaleHindiVoice();
    if (maleVoice) msg.voice = maleVoice;

    window.speechSynthesis.speak(msg);
}

// ---------------- Hindi Date ------------------------ //
function getHindiDate() {
    return new Date().toLocaleDateString("hi-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// ---------------- Preload Voices -------------------- //
window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true;
    window.speechSynthesis.getVoices();
};
