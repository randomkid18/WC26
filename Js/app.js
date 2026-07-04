/* ============================================
   WC26 - WORLD CUP 2026
   Front-End Application
   ============================================ */

(function() {
    'use strict';

    /* ---------- CONFIGURATION ---------- */
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxU6Utv2H7_cGONP6IrONrvhgvDbNkTRjx1Uvsng1L-dt6zQyAKuckQteWUP6AEOCgGLw/exec'; // GANTI DENGAN URL DEPLOYMENT ANDA

    /* ---------- STATE ---------- */
    const state = {
        currentUser: localStorage.getItem('wc26_user') || null,
        currentView: 'loading',
        activeTab: 'vote',
        onboardingSlide: 0,
        dashboardData: null,
        isMuted: false,
        muteExpiry: null,
        chatCooldown: 0,
        adminAuthenticated: false,
        secretClickCount: 0,
        secretClickLast: 0
    };

    /* ---------- DOM REFERENCES ---------- */
    const DOM = {
        loadingScreen: document.getElementById('loading-screen'),
        onboardingView: document.getElementById('onboarding-view'),
        authView: document.getElementById('auth-view'),
        mainDashboard: document.getElementById('main-dashboard'),
        adminDashboard: document.getElementById('admin-dashboard'),
        adminLoginModal: document.getElementById('admin-login-modal'),

        onboardingSlides: document.getElementById('onboarding-slides'),
        onboardingDots: document.getElementById('onboarding-dots'),
        onboardingFinishBtn: document.getElementById('onboarding-finish-btn'),

        siForm: document.getElementById('signin-form'),
        siUsername: document.getElementById('si-username'),
        siPassword: document.getElementById('si-password'),
        siSubmit: document.getElementById('si-submit'),
        siError: document.getElementById('si-error'),

        suForm: document.getElementById('signup-form'),
        suUsername: document.getElementById('su-username'),
        suPassword: document.getElementById('su-password'),
        suConfirm: document.getElementById('su-confirm'),
        suSubmit: document.getElementById('su-submit'),
        suError: document.getElementById('su-error'),

        authTabs: document.querySelectorAll('.auth-tab'),
        authForms: document.querySelectorAll('.auth-form'),

        headerBrand: document.getElementById('header-brand-trigger'),
        headerUsername: document.getElementById('header-username'),
        headerLogoutBtn: document.getElementById('header-logout-btn'),

        tabBarItems: document.querySelectorAll('.tab-bar-item'),
        tabContents: document.querySelectorAll('.tab-content'),

        countriesList: document.getElementById('countries-list'),
        voteStatusBanner: document.getElementById('vote-status-banner'),
        votedCountry: document.getElementById('voted-country'),
        voteResults: document.getElementById('vote-results'),
        totalVotes: document.getElementById('total-votes'),
        resultsList: document.getElementById('results-list'),

        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        chatSendBtn: document.getElementById('chat-send-btn'),
        chatMuteBanner: document.getElementById('chat-mute-banner'),
        chatCooldown: document.getElementById('chat-cooldown'),
        cooldownSeconds: document.getElementById('cooldown-seconds'),

        notificationsList: document.getElementById('notifications-list'),
        notifBadge: document.getElementById('notif-badge'),

        adminPinInput: document.getElementById('admin-pin-input'),
        adminPinError: document.getElementById('admin-pin-error'),
        adminVerifyBtn: document.getElementById('admin-verify-btn'),
        adminLoginClose: document.getElementById('admin-login-close'),
        adminLogoutBtn: document.getElementById('admin-logout-btn'),
        adminTabs: document.querySelectorAll('.admin-tab'),
        adminPanels: document.querySelectorAll('.admin-panel'),

        adminUsersTable: document.querySelector('#admin-users-table tbody'),
        adminVotesTable: document.querySelector('#admin-votes-table tbody'),
        adminMutedTable: document.querySelector('#admin-muted-table tbody'),
        adminNotifyForm: document.getElementById('admin-notify-form'),
        notifyTarget: document.getElementById('notify-target'),
        notifyMessage: document.getElementById('notify-message'),
        adminMuteForm: document.getElementById('admin-mute-form'),
        muteUsername: document.getElementById('mute-username'),
        muteDuration: document.getElementById('mute-duration'),

        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message'),
        loadingOverlay: document.getElementById('loading-overlay')
    };

    /* ---------- UTILITIES ---------- */
    function showToast(msg) {
        DOM.toastMessage.textContent = msg;
        DOM.toast.classList.add('show');
        setTimeout(() => DOM.toast.classList.remove('show'), 3000);
    }

    function showLoading() { DOM.loadingOverlay.classList.remove('hidden'); }
    function hideLoading() { DOM.loadingOverlay.classList.add('hidden'); }

    function switchView(viewName) {
        ['loadingScreen', 'onboardingView', 'authView', 'mainDashboard', 'adminDashboard'].forEach(v => {
            DOM[v].classList.add('hidden');
        });
        if (viewName === 'loading') DOM.loadingScreen.classList.remove('hidden');
        if (viewName === 'onboarding') DOM.onboardingView.classList.remove('hidden');
        if (viewName === 'auth') DOM.authView.classList.remove('hidden');
        if (viewName === 'dashboard') DOM.mainDashboard.classList.remove('hidden');
        if (viewName === 'admin') DOM.adminDashboard.classList.remove('hidden');
        state.currentView = viewName;
    }

    function openModal(modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeModal(modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }

    /* ---------- API CALLS ---------- */
    async function apiPost(payload) {
        try {
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            return { success: false, error: 'Network error. Please check your connection.' };
        }
    }

    async function apiGet(params) {
        try {
            const query = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
            const res = await fetch(SCRIPT_URL + '?' + query);
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            return { success: false, error: 'Network error.' };
        }
    }

    /* ---------- AUTHENTICATION ---------- */
    async function handleSignIn(e) {
        e.preventDefault();
        const username = DOM.siUsername.value.trim();
        const password = DOM.siPassword.value.trim();
        if (!username || !password) { DOM.siError.textContent = 'Please fill in all fields.'; DOM.siError.classList.remove('hidden'); return; }

        DOM.siSubmit.disabled = true;
        const res = await apiPost({ action: 'signIn', username, password });
        DOM.siSubmit.disabled = false;

        if (res.success) {
            state.currentUser = res.username;
            localStorage.setItem('wc26_user', res.username);
            DOM.siError.classList.add('hidden');
            DOM.siForm.reset();
            enterDashboard();
        } else {
            DOM.siError.textContent = res.error || 'Sign in failed.';
            DOM.siError.classList.remove('hidden');
        }
    }

    async function handleSignUp(e) {
        e.preventDefault();
        const username = DOM.suUsername.value.trim();
        const password = DOM.suPassword.value.trim();
        const confirm = DOM.suConfirm.value.trim();

        if (!username || !password || !confirm) {
            DOM.suError.textContent = 'Please fill in all fields.'; DOM.suError.classList.remove('hidden'); return;
        }
        if (password !== confirm) {
            DOM.suError.textContent = 'Passwords do not match.'; DOM.suError.classList.remove('hidden'); return;
        }
        if (username.length < 3 || password.length < 4) {
            DOM.suError.textContent = 'Username min 3 chars, password min 4 chars.'; DOM.suError.classList.remove('hidden'); return;
        }

        DOM.suSubmit.disabled = true;
        const res = await apiPost({ action: 'signUp', username, password });
        DOM.suSubmit.disabled = false;

        if (res.success) {
            DOM.suError.classList.add('hidden');
            DOM.suForm.reset();
            showToast('Account created! Please sign in.');
            switchAuthTab('signin');
        } else {
            DOM.suError.textContent = res.error || 'Sign up failed.';
            DOM.suError.classList.remove('hidden');
        }
    }

    function switchAuthTab(tab) {
        DOM.authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        DOM.authForms.forEach(f => f.classList.toggle('hidden', f.id !== (tab === 'signin' ? 'signin-form' : 'signup-form')));
    }

    function logout() {
        state.currentUser = null;
        localStorage.removeItem('wc26_user');
        state.dashboardData = null;
        stopDashboardPolling();
        switchView('auth');
    }

    /* ---------- DASHBOARD ---------- */
    async function loadDashboardData() {
        if (!state.currentUser) return;
        const res = await apiGet({ action: 'getDashboardData', username: state.currentUser });
        if (res.success) {
            state.dashboardData = res;
            state.isMuted = res.isMuted;
            state.muteExpiry = res.muteExpiry;
            renderVoteTab();
            renderChatTab();
            renderNotificationsTab();
        }
    }

    function enterDashboard() {
        DOM.headerUsername.textContent = state.currentUser;
        switchView('dashboard');
        switchTab('vote');
        loadDashboardData();
        startDashboardPolling();
    }

    let dashboardPoll = null;
    function startDashboardPolling() {
        if (dashboardPoll) clearInterval(dashboardPoll);
        dashboardPoll = setInterval(() => { if (state.currentView === 'dashboard') loadDashboardData(); }, 8000);
    }
    function stopDashboardPolling() { if (dashboardPoll) { clearInterval(dashboardPoll); dashboardPoll = null; } }

    /* ---------- VOTE TAB ---------- */
    function renderVoteTab() {
        if (!state.dashboardData) return;
        const { votes, userVoted } = state.dashboardData;

        if (userVoted) {
            DOM.voteStatusBanner.classList.remove('hidden');
            DOM.votedCountry.textContent = userVoted;
            DOM.countriesList.classList.add('hidden');
            DOM.voteResults.classList.remove('hidden');
            DOM.totalVotes.textContent = votes.total.toLocaleString();

            DOM.resultsList.innerHTML = votes.countries.map(v => `
                <div class="result-item">
                    <div class="result-header">
                        <span class="result-country">${v.country}</span>
                        <span class="result-count">${v.count} votes</span>
                    </div>
                    <div class="result-bar-bg">
                        <div class="result-bar-fill" style="width:${v.percentage}%"></div>
                    </div>
                    <div class="result-percent">${v.percentage}%</div>
                </div>
            `).join('');
        } else {
            DOM.voteStatusBanner.classList.add('hidden');
            DOM.countriesList.classList.remove('hidden');
            DOM.voteResults.classList.add('hidden');

            DOM.countriesList.innerHTML = votes.countries.map(c => `
                <div class="country-item">
                    <span class="country-name">${c.country}</span>
                    <button class="vote-btn" data-country="${c.country}">Vote</button>
                </div>
            `).join('');

            DOM.countriesList.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const country = this.dataset.country;
                    if (!confirm('Vote for ' + country + '? You can only vote once.')) return;
                    this.disabled = true;
                    const res = await apiPost({ action: 'castVote', username: state.currentUser, country });
                    if (res.success) {
                        showToast('Vote recorded!');
                        await loadDashboardData();
                    } else {
                        showToast(res.error || 'Vote failed.');
                        this.disabled = false;
                    }
                });
            });
        }
    }

    /* ---------- CHAT TAB ---------- */
    function renderChatTab() {
        if (!state.dashboardData) return;
        const { chats, isMuted } = state.dashboardData;

        if (isMuted) {
            DOM.chatMuteBanner.classList.remove('hidden');
            DOM.chatInput.disabled = true;
            DOM.chatSendBtn.disabled = true;
        } else {
            DOM.chatMuteBanner.classList.add('hidden');
            DOM.chatInput.disabled = false;
            DOM.chatSendBtn.disabled = state.chatCooldown > 0;
        }

        DOM.chatMessages.innerHTML = chats.map(chat => {
            const isOwn = chat.username.toLowerCase() === state.currentUser.toLowerCase();
            const time = new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="chat-bubble ${isOwn ? 'own' : 'other'}">
                    <div class="chat-bubble-meta">${isOwn ? 'You' : chat.username} &bull; ${time}</div>
                    <div>${escapeHtml(chat.message)}</div>
                </div>
            `;
        }).join('');
    }

    async function sendChatMessage() {
        if (state.chatCooldown > 0 || state.isMuted) return;
        const message = DOM.chatInput.value.trim();
        if (!message) return;

        DOM.chatSendBtn.disabled = true;
        const res = await apiPost({ action: 'sendChat', username: state.currentUser, message });
        DOM.chatSendBtn.disabled = false;

        if (res.success) {
            DOM.chatInput.value = '';
            startChatCooldown();
            await loadDashboardData();
            scrollToBottomChat();
        } else {
            showToast(res.error || 'Failed to send message.');
        }
    }

    function startChatCooldown() {
        state.chatCooldown = 3;
        DOM.chatCooldown.classList.remove('hidden');
        DOM.cooldownSeconds.textContent = state.chatCooldown;
        DOM.chatSendBtn.disabled = true;

        const timer = setInterval(() => {
            state.chatCooldown--;
            DOM.cooldownSeconds.textContent = state.chatCooldown;
            if (state.chatCooldown <= 0) {
                clearInterval(timer);
                DOM.chatCooldown.classList.add('hidden');
                if (!state.isMuted) DOM.chatSendBtn.disabled = false;
            }
        }, 1000);
    }

    function scrollToBottomChat() {
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ---------- NOTIFICATIONS TAB ---------- */
    function renderNotificationsTab() {
        if (!state.dashboardData) return;
        const { notifications } = state.dashboardData;

        const unreadCount = notifications.length;
        DOM.notifBadge.textContent = unreadCount;
        DOM.notifBadge.classList.toggle('hidden', unreadCount === 0);

        if (notifications.length === 0) {
            DOM.notificationsList.innerHTML = '<p class="empty-state">No notifications yet</p>';
            return;
        }

        DOM.notificationsList.innerHTML = notifications.map(n => {
            const isBroadcast = n.targetUser === 'ALL';
            const time = new Date(n.sentAt).toLocaleString();
            return `
                <div class="notification-item ${isBroadcast ? 'broadcast' : 'personal'}">
                    <div class="notification-target">${isBroadcast ? 'Broadcast' : 'Personal'}</div>
                    <div class="notification-message">${escapeHtml(n.message)}</div>
                    <div class="notification-time">${time}</div>
                </div>
            `;
        }).join('');
    }

    /* ---------- ADMIN PANEL ---------- */
    function setupSecretAdmin() {
        DOM.headerBrand.addEventListener('click', function() {
            const now = Date.now();
            if (now - state.secretClickLast < 400) state.secretClickCount++;
            else state.secretClickCount = 1;
            state.secretClickLast = now;
            if (state.secretClickCount >= 5) {
                state.secretClickCount = 0;
                openModal(DOM.adminLoginModal);
            }
        });
    }

    async function verifyAdminPin() {
        const pin = DOM.adminPinInput.value.trim();
        if (pin === 'WC26') {
            state.adminAuthenticated = true;
            closeModal(DOM.adminLoginModal);
            DOM.adminPinInput.value = '';
            DOM.adminPinError.classList.add('hidden');
            switchView('admin');
            await loadAdminData();
        } else {
            DOM.adminPinError.classList.remove('hidden');
            DOM.adminPinInput.value = '';
        }
    }

    async function loadAdminData() {
        if (!state.adminAuthenticated) return;
        showLoading();
        const res = await apiPost({ action: 'admin_getAllData', pin: 'WC26' });
        hideLoading();

        if (!res.success) { showToast(res.error || 'Failed to load admin data'); return; }

        // Render users
        DOM.adminUsersTable.innerHTML = res.users.map(u => `
            <tr><td>${escapeHtml(u.username)}</td><td>${new Date(u.createdAt).toLocaleString()}</td></tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--wc-gray-400);padding:16px;">No users</td></tr>';

        // Update notify dropdown
        const existingOptions = Array.from(DOM.notifyTarget.options).map(o => o.value);
        res.users.forEach(u => {
            if (!existingOptions.includes(u.username)) {
                const opt = document.createElement('option');
                opt.value = u.username;
                opt.textContent = u.username;
                DOM.notifyTarget.appendChild(opt);
            }
        });

        // Render votes stats
        const voteCounts = {};
        res.votes.forEach(v => { voteCounts[v.country] = (voteCounts[v.country] || 0) + 1; });
        const total = res.votes.length;
        const voteRows = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `<tr><td>${country}</td><td>${count}</td><td>${pct}%</td></tr>`;
        }).join('');
        DOM.adminVotesTable.innerHTML = voteRows || '<tr><td colspan="3" style="text-align:center;color:var(--wc-gray-400);padding:16px;">No votes yet</td></tr>';

        // Render muted users
        DOM.adminMutedTable.innerHTML = res.mutedUsers.map(m => `
            <tr><td>${escapeHtml(m.username)}</td><td>${new Date(m.expiry).toLocaleString()}</td></tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--wc-gray-400);padding:16px;">No muted users</td></tr>';
    }

    async function handleAdminNotify(e) {
        e.preventDefault();
        const target = DOM.notifyTarget.value;
        const message = DOM.notifyMessage.value.trim();
        if (!message) { showToast('Message is required'); return; }

        showLoading();
        const res = await apiPost({ action: 'admin_sendNotification', pin: 'WC26', targetUser: target, message });
        hideLoading();

        if (res.success) {
            showToast('Notification sent!');
            DOM.notifyMessage.value = '';
        } else {
            showToast(res.error || 'Failed to send notification.');
        }
    }

    async function handleAdminMute(e) {
        e.preventDefault();
        const username = DOM.muteUsername.value.trim();
        const duration = parseInt(DOM.muteDuration.value) || 0;
        if (!username || duration <= 0) { showToast('Please enter valid username and duration'); return; }

        showLoading();
        const res = await apiPost({ action: 'admin_muteUser', pin: 'WC26', username, durationMinutes: duration });
        hideLoading();

        if (res.success) {
            showToast('User muted successfully.');
            DOM.muteUsername.value = '';
            DOM.muteDuration.value = '';
            await loadAdminData();
        } else {
            showToast(res.error || 'Mute failed.');
        }
    }

    function closeAdminPanel() {
        state.adminAuthenticated = false;
        DOM.adminPinInput.value = '';
        DOM.adminPinError.classList.add('hidden');
        switchView('dashboard');
    }

    /* ---------- TAB SWITCHING ---------- */
    function switchTab(tabName) {
        state.activeTab = tabName;
        DOM.tabBarItems.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        DOM.tabContents.forEach(c => c.classList.toggle('hidden', c.id !== 'tab-' + tabName));

        if (tabName === 'chat') {
            setTimeout(scrollToBottomChat, 100);
        }
    }

    /* ---------- ONBOARDING ---------- */
    function updateOnboardingDots() {
        const dots = DOM.onboardingDots.querySelectorAll('.dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === state.onboardingSlide));
    }

    function setupOnboarding() {
        DOM.onboardingSlides.addEventListener('scroll', () => {
            const slideWidth = DOM.onboardingSlides.clientWidth;
            const newSlide = Math.round(DOM.onboardingSlides.scrollLeft / slideWidth);
            if (newSlide !== state.onboardingSlide) {
                state.onboardingSlide = newSlide;
                updateOnboardingDots();
            }
        });

        DOM.onboardingFinishBtn.addEventListener('click', () => {
            switchView('auth');
        });
    }

    /* ---------- EVENT LISTENERS ---------- */
    function setupEventListeners() {
        // Auth
        DOM.siForm.addEventListener('submit', handleSignIn);
        DOM.suForm.addEventListener('submit', handleSignUp);
        DOM.authTabs.forEach(tab => {
            tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
        });

        // Header
        DOM.headerLogoutBtn.addEventListener('click', logout);

        // Tab bar
        DOM.tabBarItems.forEach(item => {
            item.addEventListener('click', () => switchTab(item.dataset.tab));
        });

        // Chat
        DOM.chatSendBtn.addEventListener('click', sendChatMessage);
        DOM.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

        // Admin
        DOM.adminVerifyBtn.addEventListener('click', verifyAdminPin);
        DOM.adminPinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyAdminPin(); });
        DOM.adminLoginClose.addEventListener('click', () => closeModal(DOM.adminLoginModal));
        DOM.adminLogoutBtn.addEventListener('click', closeAdminPanel);
        DOM.adminLoginModal.addEventListener('click', (e) => { if (e.target === DOM.adminLoginModal) closeModal(DOM.adminLoginModal); });

        // Admin tabs
        DOM.adminTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                DOM.adminTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                DOM.adminPanels.forEach(p => p.classList.toggle('hidden', p.id !== 'admin-panel-' + tab.dataset.adminTab));
            });
        });

        // Admin forms
        DOM.adminNotifyForm.addEventListener('submit', handleAdminNotify);
        DOM.adminMuteForm.addEventListener('submit', handleAdminMute);
    }

    /* ---------- INITIALIZATION ---------- */
    function init() {
        setupEventListeners();
        setupOnboarding();
        setupSecretAdmin();

        if (state.currentUser) {
            // Show loading then dashboard
            setTimeout(() => {
                switchView('loading');
                setTimeout(() => { enterDashboard(); }, 2500);
            }, 4000);
        } else {
            // Show loading then onboarding
            setTimeout(() => {
                switchView('loading');
                setTimeout(() => { switchView('onboarding'); }, 2500);
            }, 4000);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
