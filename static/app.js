const DOM = {
    // Setup Modal
    setupModal: document.getElementById('setup-modal'),
    setupUsername: document.getElementById('setup-username'),
    setupSaveBtn: document.getElementById('setup-save-btn'),
    
    // Header & Profile Modal
    profileAvatar: document.getElementById('profile-avatar'),
    profileModal: document.getElementById('profile-modal'),
    profileModalAvatar: document.getElementById('profile-modal-avatar'),
    profileModalName: document.getElementById('profile-modal-name'),
    btnChangeChannel: document.getElementById('btn-change-channel'),
    btnCloseProfile: document.getElementById('btn-close-profile'),

    // Home / Connection
    startBtn: document.getElementById('start-btn'),
    connectionOverlay: document.getElementById('connection-overlay'),
    exitConnectionBtn: document.getElementById('exit-connection-btn'),
    overlayStatusText: document.getElementById('overlay-status-text'),
    overlayStatusDesc: document.getElementById('overlay-status-desc'),
    
    // Logs
    activityLog: document.getElementById('activity-log'),
    queueCount: document.getElementById('queue-count'),
    
    // Nav
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // Toggles (Alerts & TTS)
    homeToggleAlerts: document.getElementById('home-toggle-alerts'),
    homeToggleTts: document.getElementById('home-toggle-tts'),
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
    resetTemplateBtn: document.getElementById('reset-template'),
    previewVoiceBtn: document.getElementById('preview-voice-btn')
};

let ws = null;
let isConnected = false;
let synth = window.speechSynthesis;
let voices = [];
let ttsQueue = [];
let isSpeaking = false;
let recentMessages = new Set();
let tiktokUsername = localStorage.getItem('tiktok_username') || '';
let tiktokAvatar = localStorage.getItem('tiktok_avatar') || '';

// Default Templates
const DEFAULT_COMMENT = "{nickName} พูดว่า {comment}";
const DEFAULT_GIFT = "ขอบคุณ {nickName} สำหรับ {giftName} {giftCount} ชิ้น";

// Check first time setup
function initSetup() {
    if (!tiktokUsername) {
        DOM.setupModal.classList.remove('hidden');
    } else {
        DOM.setupModal.classList.add('hidden');
        updateProfileAvatar();
    }
}
initSetup();

function updateProfileAvatar() {
    if (tiktokAvatar) {
        DOM.profileAvatar.style.backgroundImage = `url(${tiktokAvatar})`;
        DOM.profileAvatar.textContent = '';
    } else if (tiktokUsername) {
        DOM.profileAvatar.textContent = tiktokUsername.charAt(0).toUpperCase();
        DOM.profileAvatar.style.backgroundImage = 'none';
    }
}

DOM.setupSaveBtn.addEventListener('click', () => {
    let name = DOM.setupUsername.value.trim();
    if (!name) return alert('กรุณากรอกชื่อ TikTok');
    if (name.startsWith('@')) name = name.substring(1);
    
    // If name changed, clear old avatar
    if (name !== tiktokUsername) {
        tiktokAvatar = '';
        localStorage.removeItem('tiktok_avatar');
    }

    tiktokUsername = name;
    localStorage.setItem('tiktok_username', name);
    DOM.setupModal.classList.add('hidden');
    updateProfileAvatar();
});

// Profile Modal Events
DOM.profileAvatar.addEventListener('click', () => {
    if (!tiktokUsername) {
        DOM.setupModal.classList.remove('hidden');
        return;
    }
    DOM.profileModal.classList.remove('hidden');
    DOM.profileModalName.textContent = `@${tiktokUsername}`;
    
    if (tiktokAvatar) {
        DOM.profileModalAvatar.style.backgroundImage = `url(${tiktokAvatar})`;
        DOM.profileModalAvatar.textContent = '';
    } else {
        DOM.profileModalAvatar.textContent = tiktokUsername.charAt(0).toUpperCase();
        DOM.profileModalAvatar.style.backgroundImage = 'none';
    }
});

DOM.btnCloseProfile.addEventListener('click', () => {
    DOM.profileModal.classList.add('hidden');
});

DOM.btnChangeChannel.addEventListener('click', () => {
    DOM.profileModal.classList.add('hidden');
    // Force prompt
    tiktokUsername = '';
    tiktokAvatar = '';
    localStorage.removeItem('tiktok_username');
    localStorage.removeItem('tiktok_avatar');
    DOM.setupUsername.value = '';
    updateProfileAvatar();
    DOM.setupModal.classList.remove('hidden');
});

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

// Sync Home Toggles
DOM.homeToggleAlerts.addEventListener('change', (e) => {
    DOM.toggleComments.checked = e.target.checked;
    DOM.toggleGifts.checked = e.target.checked;
    DOM.toggleFollows.checked = e.target.checked;
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
    cloudOption.textContent = "🎙️ เสียง TikTok (Cloud TTS) - แนะนำ";
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
        DOM.overlayStatusText.textContent = `กำลังเชื่อมต่อกับ @${tiktokUsername}`;
        DOM.overlayStatusDesc.textContent = 'เชื่อมต่อสำเร็จ รอรับข้อมูล...';
    } else {
        DOM.overlayStatusText.textContent = message || 'ตัดการเชื่อมต่อแล้ว';
        DOM.overlayStatusDesc.textContent = 'กรุณาเริ่มใหม่';
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
    if (!DOM.homeToggleTts.checked) {
        // If TTS is disabled entirely, just clear the item
        ttsQueue.shift();
        updateQueueCount();
        speakNext();
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
        const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(nextItem.text)}&tl=th&client=gtx`;
        const audio = new Audio(url);
        audio.playbackRate = speed;
        
        let hasProceeded = false;
        const proceed = () => {
            if (!hasProceeded) {
                hasProceeded = true;
                speakNext();
            }
        };

        audio.onended = proceed;
        audio.onerror = proceed;
        audio.play().catch(e => { proceed(); });
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
    if (!tiktokUsername) {
        initSetup();
        return;
    }

    DOM.connectionOverlay.classList.add('active');
    DOM.overlayStatusText.textContent = `กำลังเชื่อมต่อกับ @${tiktokUsername}...`;
    DOM.overlayStatusDesc.textContent = 'ระบบกำลังพยายามเข้าถึงห้อง Live';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', username: tiktokUsername }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'status') {
                if (data.status === 'connected') {
                    updateStatus(true);
                    addLog('system', null, `เชื่อมต่อสำเร็จ: @${tiktokUsername}`);
                    // Save avatar if available
                    if (data.avatarUrl) {
                        tiktokAvatar = data.avatarUrl;
                        localStorage.setItem('tiktok_avatar', tiktokAvatar);
                        updateProfileAvatar();
                    }
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
    DOM.connectionOverlay.classList.remove('active');
}

// Events
DOM.startBtn.addEventListener('click', () => {
    // Unlock SpeechSynthesis
    synth.cancel(); 
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    synth.speak(unlockUtterance);
    
    // Unlock HTML5 Audio (Cloud TTS)
    const unlockAudio = new Audio();
    unlockAudio.volume = 0;
    unlockAudio.src = 'data:audio/mp3;base64,//MkxAAQ...'; // dummy valid-ish audio
    unlockAudio.play().catch(e => {});

    connectWS();
});

DOM.exitConnectionBtn.addEventListener('click', () => {
    disconnectWS();
});

DOM.previewVoiceBtn.addEventListener('click', () => {
    // Unlock Audio Contexts just in case
    synth.cancel(); 
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    synth.speak(unlockUtterance);
    new Audio('data:audio/mp3;base64,//MkxAAQ').play().catch(e => {});

    // Queue preview message
    addToQueue("สวัสดีครับ นี่คือเสียงตัวอย่างของคุณ", 3); // High priority
});
