const API_KEY = "AIzaSyBNUYPbF051_GrDCvzcfHGDCpJo-KVLs0I";
const WAKE_WORD = "shivam";
let chatHistory = [];

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "hi-IN";
recognition.interimResults = false;

const listenBtn = document.getElementById("listenBtn");
const stopBtn = document.getElementById("stopBtn");
const autoToggle = document.getElementById("autoToggle");
const chatBox = document.getElementById("chatBox");
const statusEl = document.getElementById("status");
const micPulse = document.getElementById("micPulse");
const showHistoryBtn = document.getElementById("showHistory");
const clearHistoryBtn = document.getElementById("clearHistory");

let listening = false;
let stopped = false;

/* -------------------- Load Previous History -------------------- */
window.onload = () => {
    const saved = localStorage.getItem("shivamAI_history");
    if (saved) {
        chatHistory = JSON.parse(saved);
        chatHistory.forEach(msg => addMsg(msg.text, msg.type));
    }
};

/* ------------------------ Buttons ------------------------- */
listenBtn.onclick = () => {
    window.speechSynthesis.cancel(); // fix speech lock
    window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); // unlock
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
    chatHistory.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.time}] ${msg.type.toUpperCase()}: ${msg.text}`);
    });
};

/* ---------------------- Clear History ---------------------- */
clearHistoryBtn.onclick = () => {
    if (confirm("Kya aap sach me pura chat history delete karna chahte hain?")) {

        localStorage.removeItem("shivamAI_history");
        chatHistory = [];
        chatBox.innerHTML = "";

        console.clear();
        console.log("Chat history deleted!");

        alert("Chat history delete ho gayi!");
    }
};

/* ------------------------ Start Mic ------------------------ */
function startMic() {
    if (stopped) return;
    listening = true;
    recognition.start();
    micPulse.style.display = "block";
    statusEl.textContent = "Listening...";
}

/* ------------------- Speech Recognition -------------------- */
recognition.onresult = async (event) => {
    if (stopped) return;

    const text = event.results[0][0].transcript.toLowerCase();
    addMsg(text, "user");

    if (!text.includes(WAKE_WORD) && autoToggle.checked) {
        statusEl.textContent = `Say wake word: "${WAKE_WORD}"...`;
        setTimeout(() => startMic(), 800);
        return;
    }

    statusEl.textContent = "Thinking...";

    const response = await askAI(text);
    addMsg(response, "ai");
    speak(response);

    if (autoToggle.checked && !stopped) {
        setTimeout(() => startMic(), 1200);
    } else {
        micPulse.style.display = "none";
    }
};

/* ---------------------- AI Function ------------------------ */
async function askAI(msg) {

    if (msg.includes("डेट") || msg.includes("date")) {
        return `आज का डेट: ${getHindiDate()}`;
    }else if(msg.includes("kisne banaya tumko")){
        return "mai ek ai agent hu mujhe shivam sir ne banaya hai";
    }

    const body = {
        contents: [
            {
                parts: [
                    {
                        text: `You are Shivam AI, a friendly male assistant speaking in Hindi. User: ${msg}`
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
                body: JSON.stringify(body),
            }
        );

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "मुझे समझ नहीं आया। कृपया दोबारा कहें।";
    } catch (err) {
        console.error(err);
        return "सर्वर से जवाब नहीं मिल सका।";
    }
}

/* -------------------- Add Message to UI -------------------- */
function addMsg(text, type) {
    const div = document.createElement("div");
    div.classList.add("message", type);
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    chatHistory.push({ type, text, time: new Date().toLocaleTimeString() });
    localStorage.setItem("shivamAI_history", JSON.stringify(chatHistory));
}

/* ---------------------- Hindi Male Voice ------------------- */
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

/* ---------------------- Speak Function --------------------- */
function speak(text) {
    window.speechSynthesis.cancel(); // fix freeze

    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}|\u{2700}-\u{27BF}|\u{E000}-\u{F8FF}|\*]/gu, '');

    const msg = new SpeechSynthesisUtterance(cleanText);
    msg.lang = "hi-IN";
    msg.rate = 1;
    msg.pitch = 1;
    msg.volume = 1;

    const maleVoice = getMaleHindiVoice();
    if (maleVoice) msg.voice = maleVoice;

    window.speechSynthesis.speak(msg);
}

/* -------------------- Hindi Date Function ------------------ */
function getHindiDate() {
    const today = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return today.toLocaleDateString('hi-IN', options);
}

/* --------------------- Preload Voices ---------------------- */
window.speechSynthesis.onvoiceschanged = () => {
    console.log("Voices loaded");
    window.speechSynthesis.getVoices();
};