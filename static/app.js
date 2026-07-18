const DOM = {
    usernameInput: document.getElementById('username-input'),
    connectBtn: document.getElementById('connect-btn'),
    statusBadge: document.getElementById('status-badge'),
    activityLog: document.getElementById('activity-log'),
    queueCount: document.getElementById('queue-count'),
    
    // Nav
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // Toggles
    toggleComments: document.getElementById('toggle-comments'),
    toggleGifts: document.getElementById('toggle-gifts'),
    toggleFollows: document.getElementById('toggle-follows'),
    
    // TTS Settings
    voiceSelect: document.getElementById('voice-select'),
    speedSlider: document.getElementById('speed-slider'),
    speedValue: document.getElementById('speed-value'),
    pitchSlider: document.getElementById('pitch-slider'),
    pitchValue: document.getElementById('pitch-value'),
    
    // Templates
    ttsTabs: document.querySelectorAll('.tts-tab'),
    templateBoxes: document.querySelectorAll('.template-box'),
    templateComment: document.getElementById('template-comment'),
    templateGift: document.getElementById('template-gift'),
    resetTemplateBtn: document.getElementById('reset-template')
};

let ws = null;
let isConnected = false;
let synth = window.speechSynthesis;
let voices = [];
let ttsQueue = [];
let isSpeaking = false;
let recentMessages = new Set();

// Default Templates
const DEFAULT_COMMENT = "{nickName} พูดว่า {comment}";
const DEFAULT_GIFT = "ขอบคุณ {nickName} สำหรับ {giftName} {giftCount} ชิ้น";

// Load Settings
function loadSettings() {
    DOM.templateComment.value = localStorage.getItem('tpl_comment') || DEFAULT_COMMENT;
    DOM.templateGift.value = localStorage.getItem('tpl_gift') || DEFAULT_GIFT;
    
    DOM.speedSlider.value = localStorage.getItem('tts_speed') || "1.0";
    DOM.speedValue.textContent = DOM.speedSlider.value;
    
    if(DOM.pitchSlider) {
        DOM.pitchSlider.value = localStorage.getItem('tts_pitch') || "1.0";
        DOM.pitchValue.textContent = DOM.pitchSlider.value;
    }
}
loadSettings();

// Save Settings Event Listeners
DOM.templateComment.addEventListener('input', () => localStorage.setItem('tpl_comment', DOM.templateComment.value));
DOM.templateGift.addEventListener('input', () => localStorage.setItem('tpl_gift', DOM.templateGift.value));
DOM.speedSlider.addEventListener('input', (e) => {
    DOM.speedValue.textContent = parseFloat(e.target.value).toFixed(1);
    localStorage.setItem('tts_speed', e.target.value);
});
if(DOM.pitchSlider) {
    DOM.pitchSlider.addEventListener('input', (e) => {
        DOM.pitchValue.textContent = parseFloat(e.target.value).toFixed(1);
        localStorage.setItem('tts_pitch', e.target.value);
    });
}

DOM.resetTemplateBtn.addEventListener('click', () => {
    DOM.templateComment.value = DEFAULT_COMMENT;
    DOM.templateGift.value = DEFAULT_GIFT;
    localStorage.setItem('tpl_comment', DEFAULT_COMMENT);
    localStorage.setItem('tpl_gift', DEFAULT_GIFT);
});

// Tab Navigation Logic
DOM.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
        DOM.navItems.forEach(n => n.classList.remove('active'));
        DOM.tabPanes.forEach(t => t.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// TTS Sub-Tab Navigation
DOM.ttsTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        DOM.ttsTabs.forEach(n => n.classList.remove('active'));
        DOM.templateBoxes.forEach(t => t.style.display = 'none');
        
        btn.classList.add('active');
        document.getElementById(`template-box-${btn.dataset.tts}`).style.display = 'block';
    });
});

// Initialize Voices
function populateVoiceList() {
    voices = synth.getVoices();
    voices.sort((a, b) => {
        if (a.lang.includes('th') && !b.lang.includes('th')) return -1;
        if (!a.lang.includes('th') && b.lang.includes('th')) return 1;
        return 0;
    });

    DOM.voiceSelect.innerHTML = '';
    
    const cloudOption = document.createElement('option');
    cloudOption.textContent = "🎙️ เสียง TikTok/Siri (Cloud TTS) - แนะนำ!";
    cloudOption.value = "cloud";
    DOM.voiceSelect.appendChild(cloudOption);

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
function addLog(type, user, content) {
    const item = document.createElement('div');
    item.className = `log-item ${type}`;
    
    if (type === 'system') {
        item.innerHTML = `<div>${content}</div>`;
    } else {
        item.innerHTML = `
            <span class="user">@${user}</span>
            <span>${content}</span>
        `;
    }

    DOM.activityLog.prepend(item);
    if (DOM.activityLog.children.length > 50) {
        DOM.activityLog.lastChild.remove();
    }
}

function updateStatus(connected, message = null) {
    isConnected = connected;
    if (connected) {
        DOM.statusBadge.textContent = 'เชื่อมต่อแล้ว (Connected)';
        DOM.statusBadge.style.color = '#10b981';
        DOM.connectBtn.textContent = 'ตัดการเชื่อมต่อ (Disconnect)';
        DOM.connectBtn.style.background = '#374151';
        DOM.usernameInput.disabled = true;
    } else {
        DOM.statusBadge.textContent = message || 'ตัดการเชื่อมต่อแล้ว (Disconnected)';
        DOM.statusBadge.style.color = '#ef4444';
        DOM.connectBtn.textContent = 'เชื่อมต่อ (Connect)';
        DOM.connectBtn.style.background = '#e11d48';
        DOM.usernameInput.disabled = false;
    }
}

function updateQueueCount() {
    DOM.queueCount.textContent = `${ttsQueue.length} คิว`;
}

// Format Template Helper
function formatTemplate(templateStr, data) {
    let result = templateStr;
    result = result.replace(/{nickName}/g, data.nickName || '');
    result = result.replace(/{comment}/g, data.comment || '');
    result = result.replace(/{giftName}/g, data.giftName || '');
    result = result.replace(/{giftCount}/g, data.giftCount || '1');
    return result;
}

// TTS Queue Logic
function speakNext() {
    if (ttsQueue.length === 0) {
        isSpeaking = false;
        return;
    }
    
    isSpeaking = true;
    ttsQueue.sort((a, b) => b.priority - a.priority);
    const nextItem = ttsQueue.shift();
    updateQueueCount();

    const selectedVoiceIndex = DOM.voiceSelect.value;
    const speed = parseFloat(DOM.speedSlider.value);
    const pitch = parseFloat(DOM.pitchSlider ? DOM.pitchSlider.value : 1.0);

    if (selectedVoiceIndex === 'cloud') {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(nextItem.text)}&tl=th&client=tw-ob`;
        const audio = new Audio(url);
        audio.playbackRate = speed;
        // Pitch is not natively supported by Audio element easily, ignored for Cloud TTS
        audio.onended = () => { speakNext(); };
        audio.onerror = (e) => { speakNext(); };
        audio.play().catch(e => { speakNext(); });
    } else {
        const utterance = new SpeechSynthesisUtterance(nextItem.text);
        if (voices[selectedVoiceIndex]) {
            utterance.voice = voices[selectedVoiceIndex];
        }
        utterance.rate = speed;
        utterance.pitch = pitch;
        
        utterance.onend = () => { speakNext(); };
        utterance.onerror = (e) => { speakNext(); };
        synth.speak(utterance);
    }
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
        alert('กรุณากรอกไอดี TikTok');
        return;
    }
    if (username.startsWith('@')) username = username.substring(1);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);
    updateStatus(false, 'กำลังเชื่อมต่อ (Connecting...)');
    DOM.statusBadge.style.color = '#facc15';

    ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', username: username }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'status') {
                if (data.status === 'connected') {
                    updateStatus(true);
                    addLog('system', null, `เชื่อมต่อสำเร็จ: @${username}`);
                } else if (data.status === 'disconnected' || data.status === 'error') {
                    updateStatus(false, data.message || 'Disconnected');
                    addLog('system', null, data.message || 'หลุดการเชื่อมต่อ');
                }
            } 
            else if (data.type === 'comment') {
                const msgKey = `comment:${data.user}:${data.message}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);
                if (recentMessages.size > 200) recentMessages.delete(recentMessages.values().next().value);
                
                addLog('comment', data.user, data.message);
                if (DOM.toggleComments.checked) {
                    const textToRead = formatTemplate(DOM.templateComment.value, {
                        nickName: data.user,
                        comment: data.message
                    });
                    addToQueue(textToRead, 0);
                }
            }
            else if (data.type === 'gift') {
                const msgKey = `gift:${data.user}:${data.gift}:${data.count}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);
                
                addLog('gift', data.user, `ส่ง ${data.gift} x${data.count}`);
                if (DOM.toggleGifts.checked) {
                    const textToRead = formatTemplate(DOM.templateGift.value, {
                        nickName: data.user,
                        giftName: data.gift,
                        giftCount: data.count
                    });
                    addToQueue(textToRead, 2);
                }
            }
            else if (data.type === 'follow') {
                const msgKey = `follow:${data.user}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);
                
                addLog('follow', data.user, 'เริ่มติดตามคุณ');
                if (DOM.toggleFollows.checked) {
                    addToQueue(`ขอบคุณ ${data.user} ที่กดติดตามครับ`, 1);
                }
            }
        } catch (e) {}
    };

    ws.onclose = () => {
        updateStatus(false);
        addLog('system', null, 'ปิดการเชื่อมต่อแล้ว');
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
        synth.cancel(); 
        connectWS();
    }
});

DOM.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isConnected) {
        connectWS();
    }
});
