const DOM = {
    // Setup Modal
    setupModal: document.getElementById("setup-modal"),
    setupUsername: document.getElementById("setup-username"),
    setupSaveBtn: document.getElementById("setup-save-btn"),
    setupCancelBtn: document.getElementById("setup-cancel-btn"),

    // Header & Profile Modal
    profileAvatar: document.getElementById("profile-avatar"),
    profileModal: document.getElementById("profile-modal"),
    profileModalAvatar: document.getElementById("profile-modal-avatar"),
    profileModalName: document.getElementById("profile-modal-name"),
    btnChangeChannel: document.getElementById("btn-change-channel"),
    btnCloseProfile: document.getElementById("btn-close-profile"),
    
    // Home Profile Center
    homeAvatar: document.getElementById("home-avatar"),
    homeUsername: document.getElementById("home-username"),

    // Home / Connection
    startBtn: document.getElementById("start-btn"),
    connectionOverlay: document.getElementById("connection-overlay"),
    exitConnectionBtn: document.getElementById("exit-connection-btn"),
    btnPip: document.getElementById("btn-pip"),
    btnPipGreen: document.getElementById("btn-pip-green"),
    overlayStatusText: document.getElementById("overlay-status-text"),
    overlayStatusDesc: document.getElementById("overlay-status-desc"),

    // Logs
    activityLog: document.getElementById("activity-log"),
    queueCount: document.getElementById("queue-count"),

    // Nav
    navItems: document.querySelectorAll(".nav-item"),
    tabPanes: document.querySelectorAll(".tab-pane"),

    // Toggles (Alerts & TTS)
    homeToggleAlerts: document.getElementById("home-toggle-alerts"),
    homeToggleTts: document.getElementById("home-toggle-tts"),
    toggleComments: document.getElementById("toggle-comments"),
    toggleGifts: document.getElementById("toggle-gifts"),
    toggleFollows: document.getElementById("toggle-follows"),
    toggleShares: document.getElementById("toggle-shares"),
    toggleLikes: document.getElementById("toggle-likes"),
    toggleSfxLaugh: document.getElementById("toggle-sfx-laugh"),
    toggleSfxApplause: document.getElementById("toggle-sfx-applause"),

    // TTS Settings
    voiceSelect: document.getElementById("voice-select"),
    speedSlider: document.getElementById("speed-slider"),
    speedValue: document.getElementById("speed-value"),
    pitchSlider: document.getElementById("pitch-slider"),
    pitchValue: document.getElementById("pitch-value"),

    // Templates
    ttsTabs: document.querySelectorAll(".segment"),
    templateBoxes: document.querySelectorAll(".tts-main-view"),
    templateComment: document.getElementById("template-comment"),
    templateGift: document.getElementById("template-gift"),
    templateFollow: document.getElementById("template-follow"),
    templateShare: document.getElementById("template-share"),
    templateLike: document.getElementById("template-like"),
    resetTemplateCommentBtn: document.getElementById(
        "reset-template-comment"
    ),
    resetTemplateGiftBtn: document.getElementById("reset-template-gift"),
    resetTemplateLikeBtn: document.getElementById("reset-template-like"),
    resetTemplateShareBtn: document.getElementById("reset-template-share"),
    charCountComment: document.getElementById("char-count-comment"),
    charCountGift: document.getElementById("char-count-gift"),
    charCountLike: document.getElementById("char-count-like"),
    charCountShare: document.getElementById("char-count-share"),
    currentVoiceLang: document.getElementById("current-voice-lang"),
    previewVoiceBtn: document.getElementById("preview-voice-btn"),

    // New UI Settings
    toggles: {
        permAll: document.getElementById("perm-all"),
        permFollowers: document.getElementById("perm-followers"),
        permMembers: document.getElementById("perm-members"),
        permMods: document.getElementById("perm-mods"),
        permTeam: document.getElementById("perm-team"),
        permGifters: document.getElementById("perm-gifters"),
        spamFilter: document.getElementById("spam-filter"),
    },
    numbers: {
        spamCooldown: document.getElementById("spam-cooldown"),
        spamMaxqueue: document.getElementById("spam-maxqueue"),
        spamMaxlength: document.getElementById("spam-maxlength"),
        giftMinCoins: document.getElementById("gift-min-coins"),
    },
    cmdConditions: document.querySelectorAll(".cmd-condition"),

    // Bottom Sheets
    btnTeamModal: document.getElementById("btn-team-modal"),
    btnGifterModal: document.getElementById("btn-gifter-modal"),
    teamLevelDisplay: document.getElementById("team-level-display"),
    gifterRankDisplay: document.getElementById("gifter-rank-display"),

    bsTeam: document.getElementById("bs-team"),
    bsTeamInput: document.getElementById("bs-team-input"),
    bsTeamCancel: document.getElementById("bs-team-cancel"),
    bsTeamOk: document.getElementById("bs-team-ok"),

    bsGifter: document.getElementById("bs-gifter"),
    bsGifterListItems: document.querySelectorAll(".bs-list-item"),
};

let currentCmdCondition = localStorage.getItem("cmd_condition");
if (!["any", "dot", "slash", "both"].includes(currentCmdCondition)) {
    currentCmdCondition = "any";
}
let permTeamLevelVal = localStorage.getItem("ui_num_permTeamLevel") || "1";
let permGifterRankVal = localStorage.getItem("ui_num_permGifterRank") || "3";
let lastCommentTime = 0;

let ws = null;
let isConnected = false;
let synth = window.speechSynthesis;
let voices = [];
let ttsQueue = [];
let isSpeaking = false;
let recentMessages = new Set();
let tiktokUsername = localStorage.getItem("tiktok_username") || "";
let tiktokAvatar = localStorage.getItem("tiktok_avatar") || "";

// PiP Manager Class
class PiPManager {
    constructor() {
        this.canvas = document.getElementById("pip-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.video = document.getElementById("pip-video");
        this.messages = [];
        this.stream = null;
        this.isGreenScreen = false;
        this.init();
    }

    init() {
        this.draw();
        try {
            this.stream = this.canvas.captureStream(2);
            this.video.srcObject = this.stream;
            this.video.play().catch(() => {});
        } catch (e) {
            console.warn("Canvas captureStream not supported");
        }
    }

    addMessage(user, type, content) {
        // Document PiP Sync
        if (window.pipWindow) {
            const container =
                window.pipWindow.document.getElementById("pip-log");
            if (container) {
                const item = document.createElement("div");
                item.style.padding = "0.5rem";
                item.style.background = this.isGreenScreen ? "rgba(0,0,0,0.5)" : "#242931";
                item.style.borderRadius = "0.5rem";
                item.style.fontSize = "0.95rem";
                item.style.marginBottom = "0.5rem";
                item.className = "msg-anim";

                if (type === "system") {
                    item.innerHTML = `<div style="color:${this.isGreenScreen ? '#fff' : '#a0aec0'}">${content}</div>`;
                } else {
                    let color =
                        type === "gift"
                            ? "#f59e0b"
                            : type === "comment"
                              ? "#a0aec0"
                              : "#10b981";
                    item.innerHTML = `
                        <span style="color:#fff; font-weight:bold;">@${user}</span>
                        <span style="color:${color}; margin-left:0.5rem;">${content}</span>
                    `;
                }
                container.prepend(item);
                if (container.children.length > 20) {
                    container.lastChild.remove();
                }
            }
        }

        // Canvas Video PiP Sync
        let prefix =
            type === "gift"
                ? "🎁"
                : type === "share"
                  ? "🔄"
                  : type === "comment"
                    ? "💬"
                    : "🔔";
        this.messages.push({ user, content, prefix });
        if (this.messages.length > 4) this.messages.shift();
        this.draw();
    }

    draw() {
        this.ctx.fillStyle = this.isGreenScreen ? "#00ff00" : "#14161a";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = "#3b82f6";
        this.ctx.font = "bold 24px Inter, sans-serif";
        this.ctx.fillText(`TikTalk @${tiktokUsername}`, 20, 35);

        this.ctx.strokeStyle = "#242931";
        this.ctx.beginPath();
        this.ctx.moveTo(20, 50);
        this.ctx.lineTo(580, 50);
        this.ctx.stroke();

        let y = 80;
        this.messages.forEach((msg) => {
            this.ctx.font = "bold 18px Inter, sans-serif";
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillText(
                `${msg.prefix} ${msg.user ? "@" + msg.user + ":" : ""}`,
                20,
                y
            );

            this.ctx.font = "18px Inter, sans-serif";
            this.ctx.fillStyle = "#a0aec0";
            this.ctx.fillText(msg.content.substring(0, 50), 20, y + 25);
            y += 55;
        });
    }

    startLoop() {
        const loop = () => {
            this.draw();
            this.ctx.fillStyle =
                Date.now() % 1000 > 500 ? "#14161a" : "#1f2229";
            this.ctx.fillRect(
                this.canvas.width - 5,
                this.canvas.height - 5,
                5,
                5
            );
            setTimeout(loop, 1000);
        };
        loop();
    }

    async togglePiP() {
        if ("documentPictureInPicture" in window) {
            try {
                if (window.pipWindow) {
                    window.pipWindow.close();
                    window.pipWindow = null;
                    return;
                }

                const pipWindow =
                    await documentPictureInPicture.requestWindow({
                        width: 350,
                        height: 500,
                    });
                window.pipWindow = pipWindow;

                pipWindow.document.head.innerHTML = `
                <style>
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .msg-anim { animation: slideUpFade 0.3s ease-out forwards; }
                </style>
                `;
                pipWindow.document.body.style.background = this.isGreenScreen ? "#00ff00" : "#14161a";
                pipWindow.document.body.style.margin = "0";
                pipWindow.document.body.style.padding = "1rem";
                pipWindow.document.body.style.fontFamily =
                    "Inter, sans-serif";

                const header = document.createElement("h3");
                header.textContent = `Live: @${tiktokUsername}`;
                header.style.color = "#3b82f6";
                header.style.marginTop = "0";
                header.style.marginBottom = "1rem";
                header.style.fontSize = "1.2rem";
                pipWindow.document.body.appendChild(header);

                const logContainer = document.createElement("div");
                logContainer.id = "pip-log";
                logContainer.style.display = "flex";
                logContainer.style.flexDirection = "column";
                pipWindow.document.body.appendChild(logContainer);

                pipWindow.addEventListener("pagehide", () => {
                    window.pipWindow = null;
                });

                return;
            } catch (err) {
                console.warn(
                    "Document PiP failed, falling back to Video PiP",
                    err
                );
            }
        }

        if (!document.pictureInPictureEnabled) {
            alert("เบราว์เซอร์ของคุณไม่รองรับระบบ Picture-in-Picture");
            return;
        }
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                if (this.video.readyState === 0) {
                    await new Promise((resolve) => {
                        this.video.onloadedmetadata = resolve;
                        setTimeout(resolve, 500);
                    });
                }
                await this.video.requestPictureInPicture();
            }
        } catch (error) {
            console.error("PiP Error:", error);
            alert(
                "เกิดข้อผิดพลาดในการเปิด Picture-in-Picture: " +
                    error.message
            );
        }
    }
}
let pipManager = new PiPManager();
pipManager.startLoop();

// Default Templates
const DEFAULT_COMMENT = "{nickName} พูดว่า {comment}";
const DEFAULT_GIFT = "ขอบคุณ {nickName} สำหรับ {giftName} {giftCount} ชิ้น";
const DEFAULT_FOLLOW = "ขอบคุณ {nickName} ที่กดติดตามครับ";
const DEFAULT_SHARE = "ขอบคุณ {nickName} ที่แชร์และรีโพสต์ไลฟ์ครับ";

// Check first time setup
function initSetup() {
    if (!tiktokUsername) {
        DOM.setupModal.classList.remove("hidden");
    } else {
        DOM.setupModal.classList.add("hidden");
        updateProfileAvatar();
    }
}
initSetup();

function updateProfileAvatar() {
    if (tiktokAvatar) {
        DOM.profileAvatar.style.backgroundImage = `url(${tiktokAvatar})`;
        DOM.profileAvatar.textContent = "";
        
        DOM.homeAvatar.style.backgroundImage = `url(${tiktokAvatar})`;
        DOM.homeAvatar.textContent = "";
    } else if (tiktokUsername) {
        let initial = tiktokUsername.charAt(0).toUpperCase();
        DOM.profileAvatar.textContent = initial;
        DOM.profileAvatar.style.backgroundImage = "none";
        
        DOM.homeAvatar.textContent = initial;
        DOM.homeAvatar.style.backgroundImage = "none";
    }
    
    if (tiktokUsername) {
        DOM.homeUsername.textContent = `@${tiktokUsername}`;
    } else {
        DOM.homeUsername.textContent = `@username`;
    }
}

DOM.setupSaveBtn.addEventListener("click", async () => {
    let name = DOM.setupUsername.value.trim();
    if (!name) return alert("กรุณากรอกชื่อ TikTok");
    if (name.startsWith("@")) name = name.substring(1);

    if (name !== tiktokUsername) {
        tiktokAvatar = "";
        localStorage.removeItem("tiktok_avatar");
    }

    tiktokUsername = name;
    localStorage.setItem("tiktok_username", name);
    DOM.setupModal.classList.add("hidden");
    updateProfileAvatar();

    try {
        const res = await fetch(
            `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(name)}`
        );
        const json = await res.json();
        if (json.code === 0 && json.data && json.data.user) {
            const user = json.data.user;
            const avatar =
                user.avatarMedium || user.avatarLarger || user.avatarThumb;
            if (avatar) {
                tiktokAvatar = avatar;
                localStorage.setItem("tiktok_avatar", tiktokAvatar);
                updateProfileAvatar();
            }
        }
    } catch (e) {
        console.error("Failed to fetch avatar", e);
    }
});

DOM.profileAvatar.addEventListener("click", () => {
    if (!tiktokUsername) {
        DOM.setupModal.classList.remove("hidden");
        return;
    }
    DOM.profileModal.classList.remove("hidden");
    DOM.profileModalName.textContent = `@${tiktokUsername}`;

    if (tiktokAvatar) {
        DOM.profileModalAvatar.style.backgroundImage = `url(${tiktokAvatar})`;
        DOM.profileModalAvatar.textContent = "";
    } else {
        DOM.profileModalAvatar.textContent = tiktokUsername
            .charAt(0)
            .toUpperCase();
        DOM.profileModalAvatar.style.backgroundImage = "none";
    }
});

DOM.btnCloseProfile.addEventListener("click", () => {
    DOM.profileModal.classList.add("hidden");
});

DOM.btnChangeChannel.addEventListener("click", () => {
    DOM.profileModal.classList.add("hidden");
    DOM.setupUsername.value = tiktokUsername || "";
    if (tiktokUsername) {
        DOM.setupCancelBtn.classList.remove("hidden");
    } else {
        DOM.setupCancelBtn.classList.add("hidden");
    }
    DOM.setupModal.classList.remove("hidden");
});

DOM.setupCancelBtn.addEventListener("click", () => {
    DOM.setupModal.classList.add("hidden");
});

// Load Settings
function loadSettings() {
    DOM.templateComment.value =
        localStorage.getItem("tpl_comment") || DEFAULT_COMMENT;
    DOM.templateGift.value =
        localStorage.getItem("tpl_gift") || DEFAULT_GIFT;
    if (DOM.templateFollow)
        DOM.templateFollow.value =
            localStorage.getItem("tpl_follow") || DEFAULT_FOLLOW;
    if (DOM.templateShare)
        DOM.templateShare.value =
            localStorage.getItem("tpl_share") || DEFAULT_SHARE;

    DOM.speedSlider.value = localStorage.getItem("tts_speed") || "1.0";
    DOM.speedValue.textContent = Math.round(
        parseFloat(DOM.speedSlider.value) * 50
    );

    if (DOM.pitchSlider) {
        DOM.pitchSlider.value = localStorage.getItem("tts_pitch") || "1.0";
        DOM.pitchValue.textContent = Math.round(
            parseFloat(DOM.pitchSlider.value) * 50
        );
    }

    if (DOM.charCountComment)
        DOM.charCountComment.textContent = `${DOM.templateComment.value.length}/160`;
    if (DOM.charCountGift)
        DOM.charCountGift.textContent = `${DOM.templateGift.value.length}/160`;

    Object.keys(DOM.toggles).forEach((key) => {
        if (DOM.toggles[key]) {
            const saved = localStorage.getItem(`ui_toggle_${key}`);
            if (saved !== null) DOM.toggles[key].checked = saved === "true";
        }
    });

    Object.keys(DOM.numbers).forEach((key) => {
        if (DOM.numbers[key]) {
            const saved = localStorage.getItem(`ui_num_${key}`);
            if (saved !== null) DOM.numbers[key].value = saved;
        }
    });

    if (DOM.teamLevelDisplay)
        DOM.teamLevelDisplay.textContent = permTeamLevelVal;
    if (DOM.gifterRankDisplay)
        DOM.gifterRankDisplay.textContent = permGifterRankVal;

    DOM.cmdConditions.forEach((el) => {
        const checkMark = el.querySelector(".cmd-check");
        if (el.dataset.cmd === currentCmdCondition) {
            checkMark.style.display = "inline";
            el.querySelector("span:first-child").style.color =
                "var(--accent-gold)";
        } else {
            checkMark.style.display = "none";
            el.querySelector("span:first-child").style.color = "";
        }
    });
}
loadSettings();

DOM.templateComment.addEventListener("input", () => {
    localStorage.setItem("tpl_comment", DOM.templateComment.value);
    DOM.charCountComment.textContent = `${DOM.templateComment.value.length}/160`;
});
DOM.templateGift.addEventListener("input", () => {
    localStorage.setItem("tpl_gift", DOM.templateGift.value);
    DOM.charCountGift.textContent = `${DOM.templateGift.value.length}/160`;
});
if (DOM.templateFollow) {
    DOM.templateFollow.addEventListener("input", () =>
        localStorage.setItem("tpl_follow", DOM.templateFollow.value)
    );
}
if (DOM.templateShare) {
    DOM.templateShare.addEventListener("input", () =>
        localStorage.setItem("tpl_share", DOM.templateShare.value)
    );
}
DOM.speedSlider.addEventListener("input", (e) => {
    DOM.speedValue.textContent = Math.round(parseFloat(e.target.value) * 50);
    localStorage.setItem("tts_speed", e.target.value);
});
if (DOM.pitchSlider) {
    DOM.pitchSlider.addEventListener("input", (e) => {
        DOM.pitchValue.textContent = Math.round(
            parseFloat(e.target.value) * 50
        );
        localStorage.setItem("tts_pitch", e.target.value);
    });
}

if (DOM.resetTemplateCommentBtn) {
    DOM.resetTemplateCommentBtn.addEventListener("click", () => {
        DOM.templateComment.value = DEFAULT_COMMENT;
        localStorage.setItem("tpl_comment", DEFAULT_COMMENT);
        DOM.charCountComment.textContent = `${DOM.templateComment.value.length}/160`;
    });
}
if (DOM.resetTemplateGiftBtn) {
    DOM.resetTemplateGiftBtn.addEventListener("click", () => {
        DOM.templateGift.value = DEFAULT_GIFT;
        localStorage.setItem("tpl_gift", DEFAULT_GIFT);
        DOM.charCountGift.textContent = `${DOM.templateGift.value.length}/160`;
    });
}

Object.keys(DOM.toggles).forEach((key) => {
    if (DOM.toggles[key]) {
        DOM.toggles[key].addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem(`ui_toggle_${key}`, isChecked);

            if (key === "permAll") {
                const otherToggles = [
                    "permFollowers",
                    "permMembers",
                    "permMods",
                    "permTeam",
                    "permGifters",
                ];
                otherToggles.forEach((tKey) => {
                    if (DOM.toggles[tKey]) {
                        DOM.toggles[tKey].checked = !isChecked;
                        localStorage.setItem(
                            `ui_toggle_${tKey}`,
                            !isChecked
                        );
                    }
                });
            } else if (key !== "spamFilter" && isChecked) {
                if (DOM.toggles.permAll && DOM.toggles.permAll.checked) {
                    DOM.toggles.permAll.checked = false;
                    localStorage.setItem(`ui_toggle_permAll`, false);
                }
            }
        });
    }
});

Object.keys(DOM.numbers).forEach((key) => {
    if (DOM.numbers[key]) {
        DOM.numbers[key].addEventListener("input", (e) => {
            localStorage.setItem(`ui_num_${key}`, e.target.value);
        });
    }
});

DOM.cmdConditions.forEach((el) => {
    el.addEventListener("click", () => {
        currentCmdCondition = el.dataset.cmd;
        localStorage.setItem("cmd_condition", currentCmdCondition);

        DOM.cmdConditions.forEach((other) => {
            const checkMark = other.querySelector(".cmd-check");
            if (other === el) {
                checkMark.style.display = "inline";
                other.querySelector("span:first-child").style.color =
                    "var(--accent-gold)";
            } else {
                checkMark.style.display = "none";
                other.querySelector("span:first-child").style.color = "";
            }
        });
    });
});

if (DOM.btnTeamModal) {
    DOM.btnTeamModal.addEventListener("click", () => {
        DOM.bsTeamInput.value = permTeamLevelVal;
        DOM.bsTeam.classList.add("active");
        DOM.bsTeamInput.focus();
    });
}
if (DOM.bsTeamCancel) {
    DOM.bsTeamCancel.addEventListener("click", () =>
        DOM.bsTeam.classList.remove("active")
    );
}
if (DOM.bsTeamInput) {
    DOM.bsTeamInput.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        if (val > 1000) {
            e.target.value = 1000;
        }
    });
}

if (DOM.bsTeamOk) {
    DOM.bsTeamOk.addEventListener("click", () => {
        let val = parseInt(DOM.bsTeamInput.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 1000) val = 1000;

        permTeamLevelVal = val.toString();
        DOM.bsTeamInput.value = permTeamLevelVal;

        localStorage.setItem("ui_num_permTeamLevel", permTeamLevelVal);
        DOM.teamLevelDisplay.textContent = permTeamLevelVal;
        DOM.bsTeam.classList.remove("active");
    });
}

if (DOM.btnGifterModal) {
    DOM.btnGifterModal.addEventListener("click", () => {
        DOM.bsGifterListItems.forEach((item) => {
            const check = item.querySelector(".check");
            if (item.dataset.rank === permGifterRankVal) {
                item.classList.add("selected");
                check.style.display = "inline";
            } else {
                item.classList.remove("selected");
                check.style.display = "none";
            }
        });
        DOM.bsGifter.classList.add("active");
    });
}
DOM.bsGifterListItems.forEach((item) => {
    item.addEventListener("click", () => {
        permGifterRankVal = item.dataset.rank;
        localStorage.setItem("ui_num_permGifterRank", permGifterRankVal);
        DOM.gifterRankDisplay.textContent = permGifterRankVal;
        DOM.bsGifter.classList.remove("active");
    });
});

window.addEventListener("click", (e) => {
    if (e.target.classList.contains("bs-overlay")) {
        e.target.classList.remove("active");
    }
});

DOM.homeToggleAlerts.addEventListener("change", (e) => {
    DOM.toggleComments.checked = e.target.checked;
    DOM.toggleGifts.checked = e.target.checked;
    DOM.toggleFollows.checked = e.target.checked;
    DOM.toggleShares.checked = e.target.checked;
});

DOM.navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
        DOM.navItems.forEach((n) => n.classList.remove("active"));
        DOM.tabPanes.forEach((t) => t.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.target).classList.add("active");
    });
});

DOM.ttsTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
        DOM.ttsTabs.forEach((n) => n.classList.remove("active"));
        DOM.templateBoxes.forEach((t) => (t.style.display = "none"));

        btn.classList.add("active");
        document.getElementById(
            `tts-view-${btn.dataset.mainTts}`
        ).style.display = "block";
    });
});

function populateVoiceList() {
    voices = synth.getVoices();
    voices.sort((a, b) => {
        if (a.lang.includes("th") && !b.lang.includes("th")) return -1;
        if (!a.lang.includes("th") && b.lang.includes("th")) return 1;
        return 0;
    });

    DOM.voiceSelect.innerHTML = "";

    const cloudOption = document.createElement("option");
    cloudOption.textContent = "🎙️ เสียง TikTok (Cloud TTS) - แนะนำ";
    cloudOption.value = "cloud";
    DOM.voiceSelect.appendChild(cloudOption);

    voices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        option.value = index;
        DOM.voiceSelect.appendChild(option);
    });

    if (DOM.voiceSelect) {
        DOM.voiceSelect.addEventListener("change", (e) => {
            if (e.target.value === "cloud") {
                DOM.currentVoiceLang.textContent = "ไทย";
            } else {
                const v = voices[e.target.value];
                DOM.currentVoiceLang.textContent = v ? v.lang : "Unknown";
            }
        });
    }
}
populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

function addLog(type, user, content) {
    const item = document.createElement("div");
    item.className = `log-item ${type}`;

    if (type === "system") {
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
        DOM.overlayStatusText.textContent =
            `กำลังเชื่อมต่อกับ @${tiktokUsername}`;
        DOM.overlayStatusDesc.textContent = "เชื่อมต่อสำเร็จ รอรับข้อมูล...";
    } else {
        DOM.overlayStatusText.textContent = message || "ตัดการเชื่อมต่อแล้ว";
        DOM.overlayStatusDesc.textContent = "กรุณาเริ่มใหม่";
    }
}

function updateQueueCount() {
    DOM.queueCount.textContent = `${ttsQueue.length} คิว`;
}

// Format Template Helper (อัปเกรดให้รองรับทั้ง {nickName} และ {user})
function formatTemplate(templateStr, data) {
    let result = templateStr || "";
    result = result.replace(
        /{nickName}|{user}/g,
        data.nickName || data.user || ""
    );
    result = result.replace(/{comment}/g, data.comment || "");
    result = result.replace(/{giftName}/g, data.giftName || "");
    result = result.replace(/{giftCount}/g, data.giftCount || "1");
    result = result.replace(/{count}/g, data.count || "1");
    return result;
}

function speakNext() {
    if (ttsQueue.length === 0) {
        isSpeaking = false;
        return;
    }
    if (!DOM.homeToggleTts.checked) {
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

    if (nextItem.type === 'audio') {
        const audio = new Audio(nextItem.url);
        audio.volume = nextItem.volume || 1.0;
        
        let hasProceeded = false;
        const proceed = () => {
            if (!hasProceeded) {
                hasProceeded = true;
                speakNext();
            }
        };

        audio.onended = proceed;
        audio.onerror = proceed;
        audio.play().catch(e => {
            console.error("SFX error:", e);
            proceed();
        });
        return;
    }

    if (selectedVoiceIndex === "cloud") {
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
        audio.play().catch((e) => {
            proceed();
        });
    } else {
        const utterance = new SpeechSynthesisUtterance(nextItem.text);
        if (voices[selectedVoiceIndex]) {
            utterance.voice = voices[selectedVoiceIndex];
        }
        utterance.rate = speed;
        utterance.pitch = pitch;

        utterance.onend = () => {
            speakNext();
        };
        utterance.onerror = (e) => {
            speakNext();
        };
        synth.speak(utterance);
    }
}

function addToQueue(data, priority = 0) {
    if (typeof data === 'string') {
        ttsQueue.push({ type: 'text', text: data, priority: priority });
    } else {
        ttsQueue.push(data);
    }
    updateQueueCount();
    if (!isSpeaking) {
        speakNext();
    }
}

// WebSocket Logic (อัปเกรดให้รองรับ share และ repost พร้อมใช้ข้อความเริ่มต้นทันที)
function connectWS() {
    if (!tiktokUsername) {
        initSetup();
        return;
    }

    DOM.connectionOverlay.classList.add("active");
    DOM.overlayStatusText.textContent =
        `กำลังเชื่อมต่อกับ @${tiktokUsername}...`;
    DOM.overlayStatusDesc.textContent = "ระบบกำลังพยายามเข้าถึงห้อง Live";

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        ws.send(
            JSON.stringify({ action: "connect", username: tiktokUsername })
        );
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === "status") {
                if (data.status === "connected") {
                    updateStatus(true);
                    addLog(
                        "system",
                        null,
                        `เชื่อมต่อสำเร็จ: @${tiktokUsername}`
                    );
                    if (pipManager)
                        pipManager.addMessage(
                            null,
                            "system",
                            `เชื่อมต่อสำเร็จ: @${tiktokUsername}`
                        );
                    if (data.avatarUrl) {
                        tiktokAvatar = data.avatarUrl;
                        localStorage.setItem("tiktok_avatar", tiktokAvatar);
                        updateProfileAvatar();
                    }
                } else if (
                    data.status === "disconnected" ||
                    data.status === "error"
                ) {
                    updateStatus(false, data.message || "Disconnected");
                    addLog(
                        "system",
                        null,
                        data.message || "หลุดการเชื่อมต่อ"
                    );
                    if (pipManager)
                        pipManager.addMessage(
                            null,
                            "system",
                            data.message || "หลุดการเชื่อมต่อ"
                        );
                }
            } else if (data.type === "comment") {
                const msgKey = `comment:${data.user}:${data.message}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);
                if (recentMessages.size > 200)
                    recentMessages.delete(
                        recentMessages.values().next().value
                    );

                addLog("comment", data.user, data.message);
                if (pipManager)
                    pipManager.addMessage(
                        data.user,
                        "comment",
                        data.message
                    );

                const maxLength =
                    parseInt(DOM.numbers.spamMaxlength.value) || 300;
                if (data.message.length > maxLength) return;

                const cooldown =
                    parseInt(DOM.numbers.spamCooldown.value) || 0;
                const now = Date.now();
                if (
                    cooldown > 0 &&
                    now - lastCommentTime < cooldown * 1000
                )
                    return;

                let shouldRead = false;
                const msg = data.message.trim();
                if (currentCmdCondition === "any") shouldRead = true;
                else if (
                    currentCmdCondition === "dot" &&
                    msg.startsWith(".")
                )
                    shouldRead = true;
                else if (
                    currentCmdCondition === "slash" &&
                    msg.startsWith("/")
                )
                    shouldRead = true;
                else if (
                    currentCmdCondition === "both" &&
                    (msg.startsWith(".") || msg.startsWith("/"))
                )
                    shouldRead = true;

                // --- Permissions Check ---
                if (shouldRead) {
                    let hasPermission = false;
                    if (DOM.toggles.permAll && DOM.toggles.permAll.checked) {
                        hasPermission = true;
                    } else {
                        if (DOM.toggles.permFollowers && DOM.toggles.permFollowers.checked && data.is_follower) hasPermission = true;
                        if (DOM.toggles.permMembers && DOM.toggles.permMembers.checked && data.is_member) hasPermission = true;
                        if (DOM.toggles.permMods && DOM.toggles.permMods.checked && data.is_moderator) hasPermission = true;
                        
                        const reqTeamLevel = parseInt(permTeamLevelVal) || 1;
                        if (DOM.toggles.permTeam && DOM.toggles.permTeam.checked && (data.team_level >= reqTeamLevel)) hasPermission = true;
                        
                        const reqGifterRank = parseInt(permGifterRankVal) || 1;
                        if (DOM.toggles.permGifters && DOM.toggles.permGifters.checked && (data.gifter_rank >= reqGifterRank)) hasPermission = true;
                    }
                    if (!hasPermission) shouldRead = false;
                }
                // -------------------------

                // --- Custom SFX Rules (Comment) ---
                if (typeof customSfxRules !== 'undefined') {
                    customSfxRules.forEach(rule => {
                        if (rule.event === 'comment' && msg.includes(rule.condition)) {
                            if (rule.template) {
                                const textToRead = formatTemplate(rule.template, { nickName: data.user, user: data.user, comment: msg });
                                addToQueue(textToRead, 1);
                            }
                            addToQueue({ type: 'audio', url: rule.url, volume: rule.volume || 1.0, priority: 1 });
                        }
                    });
                }
                // ----------------------------------

                if (DOM.toggleComments.checked && shouldRead) {
                    lastCommentTime = now;
                    let cleanMsg = msg;
                    if (currentCmdCondition !== "any") {
                        cleanMsg = msg.substring(1).trim();
                    }

                    const textToRead = formatTemplate(
                        DOM.templateComment.value,
                        {
                            nickName: data.user,
                            comment: cleanMsg,
                        }
                    );

                    const maxQueue =
                        parseInt(DOM.numbers.spamMaxqueue.value) || 5;
                    if (ttsQueue.length < maxQueue) {
                        addToQueue(textToRead, 0);
                    }
                }
            } else if (data.type === "gift") {
                const msgKey = `gift:${data.user}:${data.gift}:${data.count}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);

                addLog(
                    "gift",
                    data.user,
                    `ส่ง ${data.gift} x${data.count}`
                );
                if (pipManager)
                    pipManager.addMessage(
                        data.user,
                        "gift",
                        `ส่ง ${data.gift} x${data.count}`
                    );

                const minCoins =
                    parseInt(DOM.numbers.giftMinCoins.value) || 0;
                const coinsSpent = (data.coinValue || 1) * data.count;
                if (coinsSpent < minCoins) return;

                // --- Custom SFX Rules (Gift) ---
                if (typeof customSfxRules !== 'undefined') {
                    customSfxRules.forEach(rule => {
                        if (rule.event === 'gift') {
                            const minCoinsRule = parseInt(rule.condition) || 0;
                            if (coinsSpent >= minCoinsRule) {
                                if (rule.template) {
                                    const textToRead = formatTemplate(rule.template, { nickName: data.user, user: data.user, giftName: data.gift, giftCount: data.count, count: data.count });
                                    addToQueue(textToRead, 2);
                                }
                                addToQueue({ type: 'audio', url: rule.url, volume: rule.volume || 1.0, priority: 2 });
                            }
                        }
                    });
                }
                // -------------------------------

                if (DOM.toggleGifts.checked) {
                    const textToRead = formatTemplate(
                        DOM.templateGift.value,
                        {
                            nickName: data.user,
                            giftName: data.gift,
                            giftCount: data.count,
                        }
                    );
                    addToQueue(textToRead, 2);
                }
            } else if (data.type === "like") {
                const msgKey = `like:${data.user}:${data.count}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);

                addLog("follow", data.user, `กดหัวใจให้ ${data.count} ครั้ง`);
                if (pipManager)
                    pipManager.addMessage(
                        data.user,
                        "follow",
                        `กดหัวใจให้ ${data.count} ครั้ง`
                    );

                if (DOM.toggleLikes && DOM.toggleLikes.checked) {
                    const tpl =
                        DOM.templateLike &&
                        DOM.templateLike.value.trim()
                            ? DOM.templateLike.value
                            : "ขอบคุณ {user} ที่เคาะจอ {count} ครั้ง";
                    const textToRead = formatTemplate(tpl, {
                        nickName: data.user,
                        user: data.user,
                        count: data.count
                    });
                    addToQueue(textToRead, 1);
                }
            } else if (data.type === "follow") {
                const msgKey = `follow:${data.user}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);

                addLog("follow", data.user, "เริ่มติดตามคุณ");
                if (pipManager)
                    pipManager.addMessage(
                        data.user,
                        "follow",
                        "เริ่มติดตามคุณ"
                    );
                if (DOM.toggleFollows.checked) {
                    const tpl =
                        DOM.templateFollow &&
                        DOM.templateFollow.value.trim()
                            ? DOM.templateFollow.value
                            : DEFAULT_FOLLOW;
                    const textToRead = formatTemplate(tpl, {
                        nickName: data.user,
                        user: data.user,
                    });
                    addToQueue(textToRead, 1);
                }
            } else if (data.type === "share" || data.type === "repost") {
                const isRepost =
                    data.type === "repost" ||
                    data.action === "repost" ||
                    data.is_repost;
                const actionText = isRepost
                    ? "รีโพสต์ไลฟ์ของคุณ"
                    : "แชร์ไลฟ์ของคุณ";
                const logType = "share";

                const msgKey = `${logType}:${data.user}:${isRepost ? "repost" : "share"}`;
                if (recentMessages.has(msgKey)) return;
                recentMessages.add(msgKey);

                addLog(logType, data.user, actionText);
                if (pipManager)
                    pipManager.addMessage(data.user, logType, actionText);

                if (DOM.toggleShares.checked) {
                    const tpl =
                        DOM.templateShare &&
                        DOM.templateShare.value.trim()
                            ? DOM.templateShare.value
                            : DEFAULT_SHARE;
                    let speechText = formatTemplate(tpl, {
                        nickName: data.user,
                        user: data.user,
                    });

                    if (isRepost && speechText === DEFAULT_SHARE) {
                        speechText = `ขอบคุณ ${data.user} ที่รีโพสต์ไลฟ์ครับ`;
                    }

                    addToQueue(speechText, 1);
                }
            }
        } catch (e) {}
    };

    ws.onclose = () => {
        updateStatus(false);
        addLog("system", null, "ปิดการเชื่อมต่อแล้ว");
        ttsQueue = [];
        updateQueueCount();
        synth.cancel();
        isSpeaking = false;
    };
}

function disconnectWS() {
    if (ws) {
        ws.send(JSON.stringify({ action: "disconnect" }));
        ws.close();
    }
    DOM.connectionOverlay.classList.remove("active");
}

// Events
DOM.startBtn.addEventListener("click", () => {
    synth.cancel();
    const unlockUtterance = new SpeechSynthesisUtterance("");
    unlockUtterance.volume = 0;
    synth.speak(unlockUtterance);

    const unlockAudio = new Audio();
    unlockAudio.volume = 0;
    unlockAudio.src = "data:audio/mp3;base64,//MkxAAQ...";
    unlockAudio.play().catch((e) => {});

    connectWS();
});

DOM.exitConnectionBtn.addEventListener("click", () => {
    disconnectWS();
});

DOM.btnPip.addEventListener("click", () => {
    pipManager.togglePiP();
});

DOM.btnPipGreen.addEventListener("click", () => {
    pipManager.isGreenScreen = !pipManager.isGreenScreen;
    if (pipManager.isGreenScreen) {
        DOM.btnPipGreen.style.background = "#ef4444";
        DOM.btnPipGreen.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            ปิดโหมด OBS (Green Screen)
        `;
    } else {
        DOM.btnPipGreen.style.background = "#10b981";
        DOM.btnPipGreen.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            สลับโหมด OBS (Green Screen)
        `;
    }
    
    // Update live pip window if it exists
    if (window.pipWindow) {
        window.pipWindow.document.body.style.background = pipManager.isGreenScreen ? "#00ff00" : "#14161a";
        const msgs = window.pipWindow.document.querySelectorAll(".msg-anim");
        msgs.forEach(msg => {
            msg.style.background = pipManager.isGreenScreen ? "rgba(0,0,0,0.5)" : "#242931";
            const innerDiv = msg.querySelector("div");
            if (innerDiv) innerDiv.style.color = pipManager.isGreenScreen ? "#fff" : "#a0aec0";
        });
    }
    pipManager.draw();
});

DOM.previewVoiceBtn.addEventListener("click", () => {
    synth.cancel();
    const unlockUtterance = new SpeechSynthesisUtterance("");
    unlockUtterance.volume = 0;
    synth.speak(unlockUtterance);
    new Audio("data:audio/mp3;base64,//MkxAAQ").play().catch((e) => {});

    addToQueue("สวัสดีครับ นี่คือเสียงตัวอย่างของคุณ", 3);
});

// --- CUSTOM SFX LOGIC ---
let customSfxRules = [];

function loadSfxRules() {
    try {
        const stored = localStorage.getItem('custom_sfx_rules');
        if (stored) customSfxRules = JSON.parse(stored);
    } catch(e) { console.error('Failed to load sfx rules'); }
    renderSfxRules();
}

function saveSfxRules() {
    localStorage.setItem('custom_sfx_rules', JSON.stringify(customSfxRules));
    renderSfxRules();
}

function renderSfxRules() {
    const container = document.getElementById('sfx-rules-container');
    if (!container) return;
    container.innerHTML = '';
    if (customSfxRules.length === 0) {
        container.innerHTML = '<div style="color:#6b7280; font-size:0.8rem; text-align:center;">ยังไม่มีเอฟเฟกต์เสียง</div>';
        return;
    }
    
    customSfxRules.forEach((rule, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'background:#2d3748; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;';
        
        let label = rule.event === 'comment' ? 'พิมพ์: ' : 'เปย์: ';
        label += rule.condition;
        
        div.innerHTML = `
            <div>
                <div style="font-size:0.85rem; color:white;">${label}</div>
                <div style="font-size:0.75rem; color:#a0aec0;">${rule.sourceType === 'file' ? 'ไฟล์ในเครื่อง' : 'ลิงก์ภายนอก'}</div>
            </div>
            <button onclick="deleteSfxRule(${idx})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">ลบ</button>
        `;
        container.appendChild(div);
    });
}

window.deleteSfxRule = function(idx) {
    customSfxRules.splice(idx, 1);
    saveSfxRules();
};

const sfxOverlay = document.getElementById('sfx-overlay');
const btnAddSfx = document.getElementById('btn-add-sfx');
const btnCancelSfx = document.getElementById('btn-cancel-sfx');
const btnSaveSfx = document.getElementById('btn-save-sfx');
const sfxEventType = document.getElementById('sfx-event-type');
const sfxSourceType = document.getElementById('sfx-source-type');
const sfxConditionLabel = document.getElementById('sfx-condition-label');
const sfxUrl = document.getElementById('sfx-url');
const sfxFile = document.getElementById('sfx-file');

if (btnAddSfx) {
    btnAddSfx.addEventListener('click', () => {
        sfxOverlay.style.display = 'flex';
    });
}
if (btnCancelSfx) {
    btnCancelSfx.addEventListener('click', () => {
        sfxOverlay.style.display = 'none';
    });
}

if (sfxEventType) {
    sfxEventType.addEventListener('change', () => {
        sfxConditionLabel.textContent = sfxEventType.value === 'comment' ? 'คำที่พิมพ์ (เช่น 555)' : 'มูลค่าของขวัญขั้นต่ำ (เหรียญ)';
        document.getElementById('sfx-condition-val').placeholder = sfxEventType.value === 'comment' ? '555' : '100';
    });
}

if (sfxSourceType) {
    sfxSourceType.addEventListener('change', () => {
        if (sfxSourceType.value === 'url') {
            sfxUrl.style.display = 'block';
            sfxFile.style.display = 'none';
        } else {
            sfxUrl.style.display = 'none';
            sfxFile.style.display = 'block';
        }
    });
}

if (btnSaveSfx) {
    btnSaveSfx.addEventListener('click', () => {
        const event = sfxEventType.value;
        const condition = document.getElementById('sfx-condition-val').value.trim();
        const template = document.getElementById('sfx-template').value.trim();
        const sourceType = sfxSourceType.value;
        const volume = parseFloat(document.getElementById('sfx-volume').value);
        
        if (!condition) {
            alert('กรุณากรอกเงื่อนไข'); return;
        }

        const addRule = (urlOrBase64) => {
            customSfxRules.push({
                event,
                condition,
                template,
                sourceType,
                url: urlOrBase64,
                volume
            });
            saveSfxRules();
            sfxOverlay.style.display = 'none';
            
            // clear form
            document.getElementById('sfx-condition-val').value = '';
            document.getElementById('sfx-template').value = '';
            sfxUrl.value = '';
            sfxFile.value = '';
        };

        if (sourceType === 'url') {
            const url = sfxUrl.value.trim();
            if (!url) { alert('กรุณาใส่ลิงก์เสียง'); return; }
            addRule(url);
        } else {
            const file = sfxFile.files[0];
            if (!file) { alert('กรุณาเลือกไฟล์เสียง'); return; }
            if (file.size > 500 * 1024) { alert('ไฟล์เสียงใหญ่เกินไป (ไม่เกิน 500KB)'); return; }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                addRule(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Load rules on boot
setTimeout(loadSfxRules, 500);
