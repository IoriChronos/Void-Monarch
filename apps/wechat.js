function setupWeChat() {
    const tabs = document.querySelectorAll(".wechat-tabs button");
    const panels = {
        chats: document.getElementById("wechat-chats"),
        moments: document.getElementById("wechat-moments"),
        wallet: document.getElementById("wechat-wallet"),
    };
    const chatWindow = document.getElementById("wechat-chat-window");
    const chatHeadControls = document.getElementById("chat-head-controls");
    const chatLog = document.getElementById("wechat-chat-log");
    const chatInput = document.getElementById("wechat-chat-input");
    const chatSend = document.getElementById("wechat-chat-send");
    const chatBack = document.getElementById("chat-back");
    const wechatTop = document.getElementById("wechat-top");
    const wechatBottom = document.getElementById("wechat-bottom");
    const momentsFeed = document.getElementById("wechat-moments-feed");
    const chatActionsToggle = document.getElementById("chat-actions-toggle");
    const chatActionsPanel = document.getElementById("chat-actions-panel");
    const chatActionsButtons = document.getElementById("chat-actions-buttons");
    const chatActionButtons = document.querySelectorAll("[data-chataction]");
    const chatActionForm = document.getElementById("chat-action-form");
    const chatActionDisplay = document.getElementById("chat-action-display");
    const chatActionKeypad = document.getElementById("chat-action-keypad");
    const chatActionConfirm = document.getElementById("chat-action-confirm");
    const chatActionCancel = document.getElementById("chat-action-cancel");
    const walletAmtEl = document.getElementById("wallet-balance-amt");
    const redEnvelopeOverlay = document.getElementById("red-envelope-overlay");
    const redEnvelopeAmount = document.getElementById("red-envelope-amount");
    const redEnvelopeConfirm = document.getElementById("red-envelope-confirm");
    const messageBanner = document.getElementById("message-banner");
    const messageBannerTitle = document.getElementById("message-banner-title");
    const messageBannerText = document.getElementById("message-banner-text");
    let walletBalance = 2180.0;
    let pendingRedEnvelope = null;
    let chatActionsOpen = false;
    let currentChatAction = null;
    let chatActionValue = "";
    const ACTION_PRESETS = {
        pay: { type: "pay", label: "转账金额（≤1,000,000）", min: 0.01, max: 1000000, defaultValue: 520.00 },
        red: { type: "red", label: "红包金额（0-200）", min: 0, max: 200, defaultValue: 66.00 },
    };
    let messageBannerTimer = null;
    let messageBannerTarget = null;

    const chats = [
        { id: "yuan", name: "元书", preview: "“靠近一点。”", icon: "◻", time: "刚刚", unread: 1, log: [
            { from:"in", text:"零钱到账 ¥1314.00", kind:"pay", amount: 1314.00 },
            { from:"in", text:"“你今天在门口回头三次。”" },
            { from:"out", text:"我只是觉得有人跟着我。" },
            { from:"in", text:"“那就是我。”" },
            { from:"in", text:"红包 ¥6.00", kind:"red", amount: 6.00, redeemed: false },
        ]},
        { id: "room", name: "室友", preview: "电闸修好了。", icon: "▣", time: "下午", unread: 0, log: [
            { from:"in", text:"电闸修好了，你晚点回来吗？" },
        ]},
        { id: "shadow", name: "未知 · 留影", preview: "“他在看你。”", icon: "□", time: "刚刚", unread: 0, log: [
            { from:"in", text:"“他在看你。”" },
        ]},
        { id: "sys", name: "系统通告", preview: "和平协议仍有效", icon: "▢", time: "夜里", unread: 0, log: [
            { from:"in", text:"和平协议仍有效。" },
        ]},
    ];

    const moments = [
        { who: "你", text: "今天只是想确认一件事：你有没有在看我。", time: "刚刚", likes: 23, likedByUser: false, comments: [] },
        { who: "未知信号", text: "今晚的城很安静，像在等一场失控。", time: "1 小时前", likes: 9, likedByUser: false, comments: [] },
        { who: "甜品店老板", text: "提前留了三盒奶油泡芙，希望他别发火。", time: "2 小时前", likes: 12, likedByUser: false, comments: [] },
    ];
    const momentTemplates = {
        comment: ["看见你了。", "留意安全。", "别太累。"],
        mention: ["@你 在吗？", "@你 别怕，我在。", "@你 记得回信。"]
    };

    function addMomentComment(moment, text, type = "comment") {
        if (!moment || !text) return;
        moment.comments = moment.comments || [];
        moment.comments.push({ text, type, time: new Date() });
        addMemoEntry(`朋友圈评论 · ${text}`);
        if (type === "mention" && phoneAlertHandler) {
            phoneAlertHandler("@ 提醒");
        }
        renderMoments();
    }

    function formatChatText(message) {
        if (!message) return "";
        if (message.text) return message.text;
        if (message.kind === "pay" && message.amount != null) {
            return `转账 ¥${message.amount.toFixed(2)}`;
        }
        if (message.kind === "red" && message.amount != null) {
            return message.redeemed ? `已收红包 ¥${message.amount.toFixed(2)}` : `红包 ¥${message.amount.toFixed(2)}`;
        }
        return "";
    }

    function updateWalletDisplay() {
        if (walletAmtEl) walletAmtEl.textContent = `¥ ${walletBalance.toFixed(2)}`;
    }

    function showMessageBanner(title, text, chatId) {
        if (!messageBanner || !messageBannerTitle || !messageBannerText) return;
        messageBannerTitle.textContent = title || "微信";
        messageBannerText.textContent = text || "";
        messageBannerTarget = chatId || null;
        messageBanner.classList.add("show");
        messageBanner.setAttribute("aria-hidden", "false");
        if (messageBannerTimer) clearTimeout(messageBannerTimer);
        messageBannerTimer = setTimeout(() => hideMessageBanner(), 3200);
    }

    function hideMessageBanner() {
        if (!messageBanner) return;
        messageBanner.classList.remove("show");
        messageBanner.setAttribute("aria-hidden", "true");
        if (messageBannerTimer) {
            clearTimeout(messageBannerTimer);
            messageBannerTimer = null;
        }
        messageBannerTarget = null;
    }

    function notifyChatMessage(chat, msg) {
        if (!chat || !msg) return;
        const preview = formatChatText(msg) || msg.text || "";
        showMessageBanner(chat.name, preview, chat.id);
        if (phoneAlertHandler) phoneAlertHandler(preview.includes("@") ? "@ 提醒" : "新消息");
    }

    if (messageBanner) {
        messageBanner.addEventListener("click", () => {
            if (messageBannerTarget) {
                if (typeof window.__openPhonePage === "function") {
                    window.__openPhonePage("wechat-page");
                }
                switchTab("chats");
                openChat(messageBannerTarget);
            }
            hideMessageBanner();
        });
    }

    const walletActions = [
        "转账", "收款", "红包", "扫一扫",
        "卡包", "乘车码", "生活缴费", "更多"
    ];

    function totalUnreadCount() {
        return chats.reduce((sum, c) => sum + (c.unread || 0), 0);
    }

    function renderChats() {
        const wrap = panels.chats;
        if (!wrap) return;
        wrap.innerHTML = "";
        chats.forEach(c => {
            const div = document.createElement("div");
            div.className = "wc-item";
            const meta = `
                <div class="wc-meta">
                    ${c.unread ? `<span class="wc-unread">${c.unread}</span>` : ""}
                    <span class="wc-time">${c.time}</span>
                </div>
            `;
            div.innerHTML = `
                <div class="wc-avatar">${c.icon}</div>
                <div class="wc-main">
                    <div class="wc-name">${c.name}</div>
                    <div class="wc-sub">${c.preview}</div>
                </div>
                ${meta}
            `;
            div.addEventListener("click", () => openChat(c.id));
            wrap.appendChild(div);
        });
        const top = document.getElementById("wechat-top");
        const totalUnread = totalUnreadCount();
        if (top) {
            const chatOpen = chatWindow && chatWindow.style.display !== "none";
            if (!chatOpen) top.textContent = `Wechat (${totalUnread})`;
        }
        const chatBadge = document.getElementById("chat-unread-total");
        if (chatBadge) {
            if (totalUnread > 0) {
                chatBadge.textContent = totalUnread;
                chatBadge.style.display = "inline-flex";
            } else {
                chatBadge.style.display = "none";
            }
        }
    }

    function renderMoments() {
        const wrap = momentsFeed;
        if (!wrap) return;
        wrap.innerHTML = "";
        moments.forEach(m => {
            const div = document.createElement("div");
            div.className = "moment-card";
            div.innerHTML = `
                <div class="wc-name">${m.who}</div>
                <div class="wc-sub">${m.text}</div>
                <div class="moment-meta">
                    <span>${m.time}</span>
                    <span>赞 ${m.likes}</span>
                </div>
                <div class="moment-actions">
                    <button class="like" data-act="like">${m.likedByUser ? "取消赞" : "赞一下"}</button>
                    <button data-act="comment">评论</button>
                    <button data-act="mention">@TA</button>
                </div>
            `;
            div.querySelector('[data-act="like"]').addEventListener("click", () => {
                m.likedByUser = !m.likedByUser;
                m.likes = Math.max(0, m.likes + (m.likedByUser ? 1 : -1));
                renderMoments();
            });
            const templatePanel = document.createElement("div");
            templatePanel.className = "moment-template-panel";
            const commentLabel = document.createElement("div");
            commentLabel.className = "section-label";
            commentLabel.textContent = "评论模版";
            const commentWrap = document.createElement("div");
            commentWrap.className = "template-chips";
            momentTemplates.comment.forEach(text => {
                const btn = document.createElement("button");
                btn.textContent = text;
                btn.addEventListener("click", () => {
                    addMomentComment(m, text, "comment");
                });
                commentWrap.appendChild(btn);
            });
            const mentionLabel = document.createElement("div");
            mentionLabel.className = "section-label";
            mentionLabel.textContent = "@ 模版";
            const mentionWrap = document.createElement("div");
            mentionWrap.className = "template-chips";
            momentTemplates.mention.forEach(text => {
                const btn = document.createElement("button");
                btn.textContent = text;
                btn.addEventListener("click", () => {
                    addMomentComment(m, text, "mention");
                });
                mentionWrap.appendChild(btn);
            });
            templatePanel.appendChild(commentLabel);
            templatePanel.appendChild(commentWrap);
            templatePanel.appendChild(mentionLabel);
            templatePanel.appendChild(mentionWrap);
            div.appendChild(templatePanel);
            const commentBtn = div.querySelector('[data-act="comment"]');
            const mentionBtn = div.querySelector('[data-act="mention"]');
            const togglePanel = () => {
                templatePanel.classList.toggle("show");
            };
            if (commentBtn) commentBtn.addEventListener("click", togglePanel);
            if (mentionBtn) mentionBtn.addEventListener("click", togglePanel);
            if (m.comments && m.comments.length) {
                const commentsBlock = document.createElement("div");
                commentsBlock.className = "moment-comments";
                m.comments.forEach(c => {
                    const item = document.createElement("div");
                    item.className = "moment-comment";
                    item.innerHTML = `<span>${c.type === "mention" ? "@你" : "你"}</span>${c.text}`;
                    commentsBlock.appendChild(item);
                });
                div.appendChild(commentsBlock);
            }
            wrap.appendChild(div);
        });
    }

    function renderWallet() {
        const wrap = document.getElementById("wallet-actions");
        if (!wrap) return;
        wrap.innerHTML = "";
        walletActions.forEach(a => {
            const btn = document.createElement("div");
            btn.className = "wallet-btn";
            btn.textContent = a;
            wrap.appendChild(btn);
        });
    }

    function isChatActive(id) {
        return chatWindow && chatWindow.style.display !== "none" && chatWindow.dataset.chat === id;
    }

    function switchTab(target) {
        tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.wtab === target));
        Object.entries(panels).forEach(([key, el]) => {
            if (!el) return;
            if (key === target) {
                el.style.display = key === "moments" ? "flex" : "block";
            } else {
                el.style.display = "none";
            }
        });
        if (chatWindow) chatWindow.style.display = "none";
        if (wechatBottom) wechatBottom.style.display = "grid";
        if (chatHeadControls) chatHeadControls.style.display = "none";
        setChatActions(false);
        hideRedEnvelopeOverlay();
        const unread = totalUnreadCount();
        if (wechatTop) {
            if (target === "chats") wechatTop.textContent = `Wechat (${unread})`;
            else if (target === "moments") wechatTop.textContent = "朋友圈";
            else if (target === "wallet") wechatTop.textContent = "钱包";
        }
        if (target === "chats") hideMessageBanner();
    }

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.dataset.wtab);
        });
    });

    function openChat(id) {
        const c = chats.find(x => x.id === id);
        if (!c || !chatWindow || !chatLog) return;
        c.unread = 0;
        Object.entries(panels).forEach(([, el]) => {
            if (el) el.style.display = "none";
        });
        setChatActions(false);
        hideRedEnvelopeOverlay();
        hideMessageBanner();
        chatLog.innerHTML = "";
        c.log.forEach(m => {
            const b = document.createElement("div");
            const kind = m.kind ? ` ${m.kind}` : "";
            b.className = "chat-bubble " + (m.from === "in" ? "in" : "out") + kind;
            b.textContent = formatChatText(m);
            const row = document.createElement("div");
            row.className = "chat-row " + (m.from === "in" ? "in" : "out");
            const avatar = document.createElement("div");
            avatar.className = "chat-avatar";
            avatar.textContent = m.from === "in" ? "◻" : "▣";
            row.appendChild(avatar);
            row.appendChild(b);
            if (m.kind === "red" && m.from === "in") {
                b.classList.add("red-bubble-in");
                if (!m.redeemed) {
                    b.classList.add("red-can-open");
                    b.addEventListener("click", () => showRedEnvelopeOverlay(m, id));
                }
            }
            chatLog.appendChild(row);
        });
        chatLog.scrollTop = chatLog.scrollHeight;
        chatWindow.dataset.chat = id;
        chatWindow.style.display = "flex";
        if (wechatBottom) wechatBottom.style.display = "none";
        if (wechatTop) wechatTop.textContent = c.name;
        if (chatHeadControls) chatHeadControls.style.display = "flex";
        renderChats();
    }

    function adjustWallet(delta) {
        walletBalance = Math.max(0, walletBalance + delta);
        updateWalletDisplay();
    }

    function setChatActions(open) {
        if (!chatActionsPanel || !chatActionsToggle) return;
        const shouldOpen = typeof open === "boolean" ? open : !chatActionsOpen;
        chatActionsOpen = shouldOpen;
        chatActionsPanel.classList.toggle("open", chatActionsOpen);
        chatActionsToggle.classList.toggle("active", chatActionsOpen);
        if (!chatActionsOpen) closeChatActionForm();
    }

    function openChatActionForm(type) {
        if (!chatActionForm || !chatActionsButtons) return;
        const preset = ACTION_PRESETS[type];
        if (!preset) return;
        currentChatAction = { ...preset };
        chatActionValue = preset.defaultValue.toFixed(2);
        chatActionsButtons.style.display = "none";
        chatActionForm.classList.add("show");
        updateChatActionDisplay();
        setChatActions(true);
    }

    function closeChatActionForm() {
        if (chatActionForm) chatActionForm.classList.remove("show");
        if (chatActionsButtons) chatActionsButtons.style.display = "flex";
        currentChatAction = null;
        chatActionValue = "";
    }

    function updateChatActionDisplay() {
        if (!chatActionDisplay) return;
        const num = parseFloat(chatActionValue);
        const formatted = !Number.isNaN(num) ? num.toFixed(2) : "0.00";
        chatActionDisplay.textContent = `¥${formatted}`;
    }

    function handleKeypadInput(key) {
        if (!currentChatAction) return;
        if (key === "←") {
            chatActionValue = chatActionValue.slice(0, -1);
        } else if (key === ".") {
            if (!chatActionValue.includes('.')) {
                chatActionValue = chatActionValue ? chatActionValue + '.' : '0.';
            }
        } else {
            const next = chatActionValue ? chatActionValue + key : key;
            if (chatActionValue.includes('.')) {
                const decimals = chatActionValue.split('.')[1] || "";
                if (decimals.length >= 2) return;
            }
            chatActionValue = next.replace(/^0+(\d)/, '$1');
        }
        updateChatActionDisplay();
    }

    if (chatActionKeypad) {
        const keys = ["1","2","3","4","5","6","7","8","9",".","0","←"];
        chatActionKeypad.innerHTML = "";
        keys.forEach(key => {
            const btn = document.createElement("button");
            btn.textContent = key === "←" ? "⌫" : key;
            btn.dataset.key = key;
            btn.addEventListener("click", () => handleKeypadInput(key));
            chatActionKeypad.appendChild(btn);
        });
    }

    function showRedEnvelopeOverlay(message, chatId) {
        if (!redEnvelopeOverlay || !message) return;
        pendingRedEnvelope = { message, chatId };
        setChatActions(false);
        if (redEnvelopeAmount) {
            const amt = message.amount != null ? message.amount : 0;
            redEnvelopeAmount.textContent = `¥${amt.toFixed(2)}`;
        }
        redEnvelopeOverlay.classList.add("show");
    }

    function hideRedEnvelopeOverlay() {
        if (redEnvelopeOverlay) redEnvelopeOverlay.classList.remove("show");
        pendingRedEnvelope = null;
    }

    function sendChat(textOverride, kindOverride, meta = {}) {
        if (!chatWindow || !chatInput) return;
        const id = chatWindow.dataset.chat;
        const c = chats.find(x => x.id === id);
        if (!c) return;
        const text = (textOverride != null ? textOverride : chatInput.value.trim());
        if (!text) return;
        const kind = kindOverride || "";
        const msg = {
            from: "out",
            text,
            kind,
        };
        if (meta.amount != null) msg.amount = meta.amount;
        if (meta.redeemed) msg.redeemed = true;
        c.log.push(msg);
        c.preview = text;
        c.time = "刚刚";
        chatInput.value = "";
        setChatActions(false);
        openChat(id);
        renderChats();
        setTimeout(() => {
            const replyMsg = { from:"in", text:"“我听见了。”" };
            c.log.push(replyMsg);
            c.preview = "“我听见了。”";
            c.time = "刚刚";
            const active = isChatActive(id);
            if (!active) {
                c.unread = (c.unread || 0) + 1;
                notifyChatMessage(c, replyMsg);
            }
            if (active) {
                openChat(id);
            } else {
                renderChats();
            }
        }, 500);
    }

    if (chatSend) chatSend.addEventListener("click", sendChat);
    if (chatInput) chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendChat();
        }
    });
    if (chatActionsToggle) {
        chatActionsToggle.addEventListener("click", () => {
            setChatActions();
        });
    }
    chatActionButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            openChatActionForm(btn.dataset.chataction);
        });
    });
    if (chatActionConfirm) {
        chatActionConfirm.addEventListener("click", () => {
            if (!currentChatAction) return;
            const amount = parseFloat(chatActionValue || "0");
            if (Number.isNaN(amount)) {
                alert("请输入有效的金额");
                return;
            }
            if (amount < currentChatAction.min || amount > currentChatAction.max) {
                alert(`金额需在 ${currentChatAction.min} - ${currentChatAction.max} 之间`);
                return;
            }
            const formatted = amount.toFixed(2);
            if (currentChatAction.type === "pay") {
                sendChat(`转账 ¥${formatted}`, "pay", { amount });
                adjustWallet(-amount);
                addMemoEntry(`转账 → ¥${formatted}`);
            } else if (currentChatAction.type === "red") {
                sendChat(`红包 ¥${formatted}`, "red", { amount, redeemed: true });
                adjustWallet(-amount);
            }
            closeChatActionForm();
            setChatActions(false);
        });
    }
    if (chatActionCancel) {
        chatActionCancel.addEventListener("click", () => {
            closeChatActionForm();
            setChatActions(false);
        });
    }
    if (redEnvelopeConfirm) {
        redEnvelopeConfirm.addEventListener("click", () => {
            if (pendingRedEnvelope && pendingRedEnvelope.message) {
                const msg = pendingRedEnvelope.message;
                msg.redeemed = true;
                if (msg.amount != null) {
                    msg.text = `已收红包 ¥${msg.amount.toFixed(2)}`;
                    adjustWallet(msg.amount);
                }
                const activeId = chatWindow ? chatWindow.dataset.chat : null;
                if (activeId && pendingRedEnvelope.chatId === activeId) {
                    openChat(activeId);
                } else {
                    renderChats();
                }
            }
            hideRedEnvelopeOverlay();
        });
    }
    if (redEnvelopeOverlay) {
        redEnvelopeOverlay.addEventListener("click", (e) => {
            if (e.target === redEnvelopeOverlay) {
                hideRedEnvelopeOverlay();
            }
        });
    }
    if (chatBack) chatBack.addEventListener("click", () => {
        if (chatWindow) chatWindow.style.display = "none";
        switchTab("chats");
        hideRedEnvelopeOverlay();
        const top = document.getElementById("wechat-top");
        if (top) top.textContent = `Wechat (${totalUnreadCount()})`;
        hideMessageBanner();
    });

    /* 电话页：记录/联系人/拨号 */
    const callTabs = document.querySelectorAll('[data-ctab]');
    const callPanels = {
        history: document.getElementById("call-history"),
        contacts: document.getElementById("call-contacts"),
        keypad: document.getElementById("call-keypad"),
    };
    const dialDisplay = document.getElementById("dial-display");
    const dialGrid = document.getElementById("dial-grid");
    const dialCall = document.getElementById("dial-call");
    const callHistory = [
        { name: "未知来电", time: "刚刚", note: "00:42" },
        { name: "室友", time: "昨天", note: "01:10" },
        { name: "未知号码", time: "前天", note: "未接" },
    ];
    const contacts = [
        { name: "元书", tel: "未知线路" },
        { name: "室友", tel: "131****8888" },
        { name: "学妹", tel: "185****0000" },
    ];
    function renderCallHistory() {
        const wrap = callPanels.history;
        if (!wrap) return;
        wrap.innerHTML = "";
        callHistory.forEach(c => {
            const div = document.createElement("div");
            div.className = "call-item";
            div.innerHTML = `
                <div class="top"><span>${c.name}</span><span>${c.time}</span></div>
                <div class="sub">${c.note}</div>
            `;
            wrap.appendChild(div);
        });
    }
    function renderContactsList() {
        const wrap = callPanels.contacts;
        if (!wrap) return;
        wrap.innerHTML = "";
        contacts.forEach(c => {
            const div = document.createElement("div");
            div.className = "call-item";
            div.innerHTML = `<div class="top"><span>${c.name}</span><span>${c.tel}</span></div>`;
            wrap.appendChild(div);
        });
    }
    function renderDial() {
        if (!dialGrid) return;
        const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];
        dialGrid.innerHTML = "";
        keys.forEach(k => {
            const btn = document.createElement("button");
            btn.className = "dial-key";
            btn.textContent = k;
            btn.addEventListener("click", () => {
                const base = dialDisplay.textContent === "输入号码…" ? "" : dialDisplay.textContent;
                dialDisplay.textContent = base + k;
            });
            dialGrid.appendChild(btn);
        });
        if (dialCall) {
            dialCall.addEventListener("click", () => {
                const num = (dialDisplay.textContent || "").trim() || "未知号码";
                callHistory.unshift({ name: num, time: "刚刚", note: "去电" });
                renderCallHistory();
                dialDisplay.textContent = "输入号码…";
                addMemoEntry(`呼出 → 元书`);
                triggerIslandNotify("呼出：元书");
                startCallSession("元书", "outgoing");
            });
        }
    }
    function switchCallTab(target) {
        callTabs.forEach(btn => btn.classList.toggle("active", btn.dataset.ctab === target));
        Object.entries(callPanels).forEach(([key, el]) => {
            if (el) el.style.display = (key === target) ? "grid" : "none";
        });
    }
    callTabs.forEach(btn => btn.addEventListener("click", () => switchCallTab(btn.dataset.ctab)));
    renderCallHistory();
    renderContactsList();
    renderDial();
    switchCallTab("history");

    function triggerIncomingCall(name = "未知来电", retry = true) {
        callHistory.unshift({ name, time: "刚刚", note: "来电" });
        renderCallHistory();
        switchCallTab("history");
        triggerIslandNotify(`来电：${name}`);
        addMemoEntry(`来电 ← ${name}`);
        showIslandCallAlert(name, { retry });
    }
    window.triggerIncomingCall = triggerIncomingCall;

    renderChats();
    renderMoments();
    renderWallet();
    switchTab("chats");

    updateWalletDisplay();

    // 黑雾点击：注入消息+转账，触发岛通知
    document.querySelectorAll('.app-icon[data-target="darkfog-page"]').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetChat = chats.find(x => x.id === "yuan");
            if (targetChat) {
                const wasActive = isChatActive(targetChat.id);
                targetChat.log.push({ from:"in", text:"黑雾覆盖：他在看你。" });
                targetChat.log.push({ from:"in", text:"红包 ¥18.00", kind:"red", amount: 18.00, redeemed: false });
                targetChat.log.push({ from:"in", text:"转账 ¥66.00", kind:"pay", amount: 66.00 });
                targetChat.preview = "转账 ¥66.00";
                targetChat.time = "刚刚";
                if (wasActive) {
                    openChat(targetChat.id);
                } else {
                    targetChat.unread = (targetChat.unread || 0) + 3;
                    notifyChatMessage(targetChat, targetChat.log[targetChat.log.length - 1]);
                }
                walletBalance += 66;
                updateWalletDisplay();
                renderChats();
            }
        });
    });

    // 守望：触发来电
    document.querySelectorAll('.app-icon[data-target="watch-page"]').forEach(icon => {
        icon.addEventListener('click', () => {
            triggerIncomingCall("守望 · 来电");
        });
    });
}

window.setupWeChat = setupWeChat;
