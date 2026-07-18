const DOM = {
    usernameInput: document.getElementById('username-input'),
    connectBtn: document.getElementById('connect-btn'),
    statusBadge: document.getElementById('status-badge'),
    activityLog: document.getElementById('activity-log'),
    voiceSelect: document.getElementById('voice-select'),
    speedSlider: document.getElementById('speed-slider'),
    speedValue: document.getElementById('speed-value'),
    queueCount: document.getElementById('queue-count')
};

let ws = null;
let isConnected = false;
let synth = window.speechSynthesis;
let voices = [];
let ttsQueue = [];
let isSpeaking = false;

// Initialize Voices
function populateVoiceList() {
    voices = synth.getVoices().filter(voice => voice.lang.includes('th') || voice.lang.includes('en'));
    
    // Sort Thai voices first
    voices.sort((a, b) => {
        if (a.lang.includes('th') && !b.lang.includes('th')) return -1;
        if (!a.lang.includes('th') && b.lang.includes('th')) return 1;
        return 0;
    });

    DOM.voiceSelect.innerHTML = '';
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = index;
        DOM.voiceSelect.appendChild(option);
    });
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

// UI Helpers
DOM.speedSlider.addEventListener('input', (e) => {
    DOM.speedValue.textContent = parseFloat(e.target.value).toFixed(1);
});

function addLog(type, user, content) {
    const emptyState = DOM.activityLog.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    
    if (type === 'system') {
        item.innerHTML = `<div class="content">${content}</div>`;
    } else {
        item.innerHTML = `
            <div class="user">@${user}</div>
            <div class="content">${content}</div>
        `;
    }

    DOM.activityLog.prepend(item);
    
    // Keep only last 50 items
    if (DOM.activityLog.children.length > 50) {
        DOM.activityLog.lastChild.remove();
    }
}

function updateStatus(connected, message = null) {
    isConnected = connected;
    if (connected) {
        DOM.statusBadge.textContent = 'Connected';
        DOM.statusBadge.className = 'status-badge connected';
        DOM.connectBtn.textContent = 'Disconnect';
        DOM.connectBtn.className = 'btn danger';
        DOM.usernameInput.disabled = true;
    } else {
        DOM.statusBadge.textContent = message || 'Disconnected';
        DOM.statusBadge.className = 'status-badge disconnected';
        DOM.connectBtn.textContent = 'Connect';
        DOM.connectBtn.className = 'btn primary';
        DOM.usernameInput.disabled = false;
    }
}

function updateQueueCount() {
    DOM.queueCount.textContent = `${ttsQueue.length} in queue`;
}

// TTS Queue Logic
function speakNext() {
    if (ttsQueue.length === 0) {
        isSpeaking = false;
        return;
    }
    
    isSpeaking = true;
    
    // Priority: Gift (2) > Follow (1) > Comment (0)
    ttsQueue.sort((a, b) => b.priority - a.priority);
    const nextItem = ttsQueue.shift();
    updateQueueCount();

    const utterance = new SpeechSynthesisUtterance(nextItem.text);
    
    const selectedVoiceIndex = DOM.voiceSelect.value;
    if (voices[selectedVoiceIndex]) {
        utterance.voice = voices[selectedVoiceIndex];
    }
    
    utterance.rate = parseFloat(DOM.speedSlider.value);
    
    utterance.onend = () => {
        speakNext();
    };
    
    utterance.onerror = (e) => {
        console.error('Speech synthesis error', e);
        speakNext();
    };

    synth.speak(utterance);
}

function addToQueue(text, priority) {
    ttsQueue.push({ text, priority });
    updateQueueCount();
    if (!isSpeaking) {
        speakNext();
    }
}

// WebSocket Logic
function connectWS() {
    let username = DOM.usernameInput.value.trim();
    if (!username) {
        alert('Please enter a TikTok username');
        return;
    }
    if (username.startsWith('@')) {
        username = username.substring(1);
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);
    addLog('system', null, 'Connecting to server...');

    ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', username: username }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'status') {
                if (data.status === 'connected') {
                    updateStatus(true);
                    addLog('system', null, `Connected to LIVE: @${username}`);
                    addToQueue("เชื่อมต่อกับไลฟ์สำเร็จแล้ว", 3);
                } else if (data.status === 'disconnected' || data.status === 'error') {
                    updateStatus(false, 'Disconnected');
                    addLog('system', null, data.message || 'Disconnected from LIVE');
                }
            } 
            else if (data.type === 'comment') {
                addLog('comment', data.user, data.message);
                addToQueue(`${data.user} พิมพ์ว่า ${data.message}`, 0);
            }
            else if (data.type === 'gift') {
                addLog('gift', data.user, `Sent ${data.gift} x${data.count}`);
                addToQueue(`ขอบคุณ ${data.user} สำหรับ ${data.gift} ${data.count} ชิ้นครับ`, 2);
            }
            else if (data.type === 'follow') {
                addLog('follow', data.user, 'Started following!');
                addToQueue(`ขอบคุณ ${data.user} ที่กดติดตามครับ`, 1);
            }
        } catch (e) {
            console.error('Error parsing WS message', e);
        }
    };

    ws.onclose = () => {
        updateStatus(false);
        addLog('system', null, 'Connection closed');
        ttsQueue = [];
        updateQueueCount();
        synth.cancel();
        isSpeaking = false;
    };
}

function disconnectWS() {
    if (ws) {
        ws.send(JSON.stringify({ action: 'disconnect' }));
        ws.close();
    }
}

// Events
DOM.connectBtn.addEventListener('click', () => {
    if (isConnected) {
        disconnectWS();
    } else {
        // Need user interaction to initialize speech synthesis
        synth.cancel(); 
        connectWS();
    }
});

DOM.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isConnected) {
        connectWS();
    }
});
