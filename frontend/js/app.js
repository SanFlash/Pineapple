// Pineapple - Main Application Logic

// --- State Management ---
const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    socket: null,
    activeChatUserId: null,
    activeChatUserName: null
};

// --- Toast Notifications ---
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- API Helpers ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`/api${endpoint}`, options);
    
    if (res.status === 401 || res.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        state.token = null;
        state.user = null;
        navigateTo('/login');
        throw new Error('Session expired. Please log in again.');
    }
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'API Error');
    return data;
}

// --- Three.js Background ---
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container || container.children.length > 0) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) {
        positions[i] = (Math.random() - 0.5) * 20;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xfacc15,
        transparent: true,
        opacity: 0.3
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- Socket.IO ---
function initSocket() {
    if (!state.token || state.socket) return;
    state.socket = io();
    
    state.socket.on('connect', () => {
        state.socket.emit('join', { user_id: state.user.id });
    });
    
    state.socket.on('receive_message', (msg) => {
        // If we are currently chatting with the sender or we sent it
        if (state.activeChatUserId == msg.sender_id || state.user.id == msg.sender_id) {
            appendMessage(msg);
        } else {
            showToast(`New message received!`);
        }
    });
}

// --- Chat UI ---
function openChat(userId, userName) {
    state.activeChatUserId = userId;
    state.activeChatUserName = userName;
    
    const chatWidget = document.getElementById('chatWidget');
    if (!chatWidget) return;
    
    document.getElementById('chatTitle').textContent = userName;
    chatWidget.classList.add('visible');
    
    loadChatHistory(userId);
}

function closeChat() {
    const chatWidget = document.getElementById('chatWidget');
    if (chatWidget) chatWidget.classList.remove('visible');
    state.activeChatUserId = null;
}

async function loadChatHistory(userId) {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;">Loading...</div>';
    try {
        const messages = await apiCall(`/messages/${userId}`);
        messagesContainer.innerHTML = '';
        if(messages.length === 0) {
            messagesContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;">No messages yet.</div>';
        } else {
            messages.forEach(appendMessage);
        }
    } catch (err) {
        messagesContainer.innerHTML = '<div class="error-msg visible">Failed to load</div>';
    }
}

function appendMessage(msg) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    const isSent = msg.sender_id === state.user.id;
    div.className = `msg ${isSent ? 'msg-sent' : 'msg-received'}`;
    div.textContent = msg.content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendMessage(e) {
    if(e.type === 'keydown' && e.key !== 'Enter') return;
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content || !state.activeChatUserId || !state.socket) return;
    
    state.socket.emit('send_message', {
        sender_id: state.user.id,
        receiver_id: state.activeChatUserId,
        content: content
    });
    input.value = '';
}

// --- Router & Views ---
const views = {
    home: () => `
        <div class="hero">
            <div class="badge">✨ The new standard for hiring</div>
            <h1>Hire top tier talent <br/><span class="gradient-text">at the speed of thought.</span></h1>
            <p>An AI-powered ecosystem connecting professionals instantly. Say goodbye to outdated job boards.</p>
            <div class="hero-actions">
                <a href="/dashboard" data-link class="btn btn-primary btn-glow">Find Opportunities</a>
                <a href="/login" data-link class="btn btn-secondary glass-panel">Post a Job</a>
            </div>
        </div>
    `,
    login: () => `
        <div class="glass-panel form-container">
            <h2>Welcome back</h2>
            <p>Enter your details to access your dashboard.</p>
            <form id="loginForm">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" class="input-glass" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" class="input-glass" required>
                </div>
                <div id="errorMsg" class="error-msg"></div>
                <button type="submit" class="btn btn-primary" style="width:100%;margin-top:10px;">Login &rarr;</button>
                <div style="margin-top:20px;text-align:center;font-size:14px;color:var(--text-muted)">
                    Don't have an account? <a href="/register" data-link style="color:white;">Sign up</a>
                </div>
            </form>
        </div>
    `,
    register: () => `
        <div class="glass-panel form-container">
            <h2>Join Pineapple</h2>
            <p>Create an account to get started.</p>
            <form id="registerForm">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="name" class="input-glass" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="email" class="input-glass" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" class="input-glass" required>
                </div>
                <div class="form-group">
                    <label>I am a...</label>
                    <select id="role" class="input-glass" style="background-color: var(--base-800);">
                        <option value="Candidate">Candidate (Looking for jobs)</option>
                        <option value="Hirer">Hirer (Posting jobs)</option>
                    </select>
                </div>
                <div id="errorMsg" class="error-msg"></div>
                <button type="submit" class="btn btn-primary" style="width:100%;margin-top:10px;">Create Account &rarr;</button>
                <div style="margin-top:20px;text-align:center;font-size:14px;color:var(--text-muted)">
                    Already have an account? <a href="/login" data-link style="color:white;">Log in</a>
                </div>
            </form>
        </div>
    `,
    dashboard: () => {
        const isHirer = state.user.role === 'Hirer';
        return `
        <div class="container" style="flex-grow:1; display:flex; flex-direction:column;">
            <div class="dashboard-header">
                <div>
                    <h2 style="font-size:32px;margin-bottom:8px;">${isHirer ? 'Manage Roles' : 'Opportunities'}</h2>
                    <p style="color:var(--text-muted)">${isHirer ? 'Post and manage your job listings.' : 'Discover jobs tailored to your skillset.'}</p>
                </div>
                ${isHirer ? `<button id="btnCreateJob" class="btn btn-primary btn-glow">Create New Job</button>` : ''}
            </div>

            <div class="dashboard-grid">
                <div class="sidebar">
                    <button class="sidebar-btn active" id="tabJobs">
                        <span>${isHirer ? 'Your Jobs' : 'Available Roles'}</span>
                    </button>
                    <button class="sidebar-btn" id="tabApps">
                        <span>${isHirer ? 'Applications' : 'My Applications'}</span>
                    </button>
                    <button class="sidebar-btn" id="tabMessages">
                        <span>Messages</span>
                    </button>
                </div>
                
                <div class="glass-panel dashboard-content" id="dashboardContent">
                    Loading...
                </div>
            </div>
            
            <!-- Chat Widget -->
            <div id="chatWidget" class="chat-widget">
                <div class="chat-header">
                    <h4 id="chatTitle">Chat</h4>
                    <button class="chat-close" onclick="closeChat()">&times;</button>
                </div>
                <div id="chatMessages" class="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" class="chat-input" placeholder="Type a message..." onkeydown="sendMessage(event)">
                    <button onclick="sendMessage({type:'click'})" class="btn btn-primary" style="padding:6px 12px;font-size:12px;">Send</button>
                </div>
            </div>
            
            <!-- Create Job Modal (Hidden by default) -->
            <div id="createJobModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:200; align-items:center; justify-content:center;">
                <div class="glass-panel form-container" style="max-height:90vh; overflow-y:auto; position:relative;">
                    <button onclick="document.getElementById('createJobModal').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:white;cursor:pointer;font-size:20px;">&times;</button>
                    <h2 style="margin-bottom:20px;">Post a Job</h2>
                    <form id="createJobForm">
                        <div class="form-group"><label>Title</label><input type="text" id="jTitle" class="input-glass" required></div>
                        <div class="form-group"><label>Company</label><input type="text" id="jCompany" class="input-glass" required></div>
                        <div class="form-group"><label>Location</label><input type="text" id="jLocation" class="input-glass" required></div>
                        <div class="form-group"><label>Salary</label><input type="text" id="jSalary" class="input-glass" required></div>
                        <div class="form-group">
                            <label>Type</label>
                            <select id="jType" class="input-glass" style="background-color: var(--base-800);">
                                <option>Full-time</option><option>Hybrid</option><option>Remote</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Tags (comma separated)</label><input type="text" id="jTags" class="input-glass"></div>
                        <div class="form-group"><label>Description</label><textarea id="jDesc" class="input-glass" rows="3"></textarea></div>
                        <button type="submit" class="btn btn-primary" style="width:100%;">Create Job</button>
                    </form>
                </div>
            </div>
        </div>
        `;
    }
};

// --- Dashboard Logic ---
async function loadDashboardJobs() {
    const container = document.getElementById('dashboardContent');
    container.innerHTML = '<div style="color:var(--text-muted)">Loading jobs...</div>';
    try {
        const jobs = await apiCall('/jobs');
        if(jobs.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No jobs found.</div>';
            return;
        }
        
        container.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div>
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:4px;">
                        <div class="job-title">${job.title}</div>
                        <div class="job-tag" style="background:var(--base-950);">${job.type}</div>
                    </div>
                    <div class="job-meta">${job.company} &middot; ${job.location}</div>
                    <div class="job-tags">
                        ${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}
                    </div>
                </div>
                <div class="job-actions">
                    <div class="job-salary">${job.salary}</div>
                    ${state.user.role === 'Candidate' ? 
                        `<button onclick="applyJob(${job.id})" class="btn btn-primary" style="padding:6px 16px; font-size:12px;">Quick Apply</button>
                         <button onclick="openChat(${job.hirer_id}, '${job.company} Hirer')" class="btn btn-secondary" style="padding:6px 16px; font-size:12px;">Message Hirer</button>` 
                        : ''}
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<div class="error-msg visible">Failed to load jobs.</div>';
    }
}

async function loadDashboardApps() {
    const container = document.getElementById('dashboardContent');
    container.innerHTML = '<div style="color:var(--text-muted)">Loading applications...</div>';
    try {
        const apps = await apiCall('/applications');
        if(apps.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No applications found.</div>';
            return;
        }
        
        if (state.user.role === 'Candidate') {
            container.innerHTML = apps.map(app => `
                <div class="job-card">
                    <div>
                        <div class="job-title">${app.title} at ${app.company}</div>
                        <div class="job-meta">Applied on ${new Date(app.applied_at).toLocaleDateString()}</div>
                    </div>
                    <div class="job-actions">
                        <div class="job-tag" style="color:var(--pine-400); border-color:var(--pine-400)">${app.status}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = apps.map(app => `
                <div class="job-card">
                    <div>
                        <div class="job-title">${app.candidate_name} applied for ${app.title}</div>
                        <div class="job-meta">Email: ${app.candidate_email} &middot; ${new Date(app.applied_at).toLocaleDateString()}</div>
                    </div>
                    <div class="job-actions">
                        <div class="job-tag" style="color:var(--pine-400); border-color:var(--pine-400)">${app.status}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch(e) {
        container.innerHTML = '<div class="error-msg visible">Failed to load applications.</div>';
    }
}

async function loadDashboardMessages() {
    const container = document.getElementById('dashboardContent');
    container.innerHTML = '<div style="color:var(--text-muted)">Loading conversations...</div>';
    try {
        const convos = await apiCall('/conversations');
        if(convos.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted)">No active conversations.</div>';
            return;
        }
        container.innerHTML = convos.map(u => `
            <div class="job-card" style="cursor:pointer;" onclick="openChat(${u.id}, '${u.name}')">
                <div>
                    <div class="job-title">${u.name}</div>
                    <div class="job-meta">${u.role}</div>
                </div>
                <div class="job-actions">
                    <button class="btn btn-secondary" style="padding:6px 16px; font-size:12px;">Open Chat</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        container.innerHTML = '<div class="error-msg visible">Failed to load conversations.</div>';
    }
}

window.applyJob = async (jobId) => {
    try {
        await apiCall(`/jobs/${jobId}/apply`, 'POST');
        showToast('Application submitted successfully!');
    } catch(err) {
        showToast(err.message);
    }
}

window.openChat = openChat;
window.closeChat = closeChat;
window.sendMessage = sendMessage;

function bindDashboardEvents() {
    const tabJobs = document.getElementById('tabJobs');
    const tabApps = document.getElementById('tabApps');
    const tabMessages = document.getElementById('tabMessages');
    const tabs = [tabJobs, tabApps, tabMessages];

    const setActive = (activeTab) => {
        tabs.forEach(t => t.classList.remove('active'));
        activeTab.classList.add('active');
    };

    tabJobs.addEventListener('click', () => { setActive(tabJobs); loadDashboardJobs(); });
    tabApps.addEventListener('click', () => { setActive(tabApps); loadDashboardApps(); });
    tabMessages.addEventListener('click', () => { setActive(tabMessages); loadDashboardMessages(); });

    const btnCreateJob = document.getElementById('btnCreateJob');
    if(btnCreateJob) {
        btnCreateJob.addEventListener('click', () => {
            document.getElementById('createJobModal').style.display = 'flex';
        });
        
        document.getElementById('createJobForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                title: document.getElementById('jTitle').value,
                company: document.getElementById('jCompany').value,
                location: document.getElementById('jLocation').value,
                salary: document.getElementById('jSalary').value,
                type: document.getElementById('jType').value,
                tags: document.getElementById('jTags').value.split(',').map(s=>s.trim()),
                description: document.getElementById('jDesc').value,
            };
            try {
                await apiCall('/jobs', 'POST', body);
                document.getElementById('createJobModal').style.display = 'none';
                showToast('Job created successfully!');
                loadDashboardJobs();
            } catch(err) {
                showToast(err.message);
            }
        });
    }

    loadDashboardJobs();
}

// --- Routing & Rendering ---
function renderNav() {
    const navActions = document.getElementById('nav-actions');
    if (state.token) {
        navActions.innerHTML = `
            <a href="/dashboard" data-link class="nav-link">Dashboard</a>
            <button id="logoutBtn" class="btn btn-secondary" style="padding:6px 16px;">Logout</button>
        `;
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            state.token = null; state.user = null;
            if(state.socket) { state.socket.disconnect(); state.socket = null; }
            navigateTo('/');
        });
    } else {
        navActions.innerHTML = `
            <a href="/login" data-link class="nav-link">Log in</a>
            <a href="/register" data-link class="btn btn-primary" style="padding:6px 16px;">Sign up</a>
        `;
    }
}

async function handleRoute() {
    const path = window.location.pathname;
    const root = document.getElementById('app-root');
    
    // Auth Guards
    if ((path === '/dashboard') && !state.token) return navigateTo('/login');
    if ((path === '/login' || path === '/register') && state.token) return navigateTo('/dashboard');

    root.classList.remove('visible');
    
    setTimeout(() => {
        let view = views.home;
        if (path === '/login') view = views.login;
        if (path === '/register') view = views.register;
        if (path === '/dashboard') view = views.dashboard;

        root.innerHTML = view();
        renderNav();
        bindLinks();
        
        // Bind forms
        if (path === '/login') {
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const err = document.getElementById('errorMsg');
                try {
                    const res = await apiCall('/auth/login', 'POST', {
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value
                    });
                    localStorage.setItem('token', res.access_token);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    state.token = res.access_token; state.user = res.user;
                    navigateTo('/dashboard');
                } catch(error) { err.textContent = error.message; err.classList.add('visible'); }
            });
        }
        
        if (path === '/register') {
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const err = document.getElementById('errorMsg');
                try {
                    const res = await apiCall('/auth/register', 'POST', {
                        name: document.getElementById('name').value,
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value,
                        role: document.getElementById('role').value
                    });
                    localStorage.setItem('token', res.access_token);
                    localStorage.setItem('user', JSON.stringify(res.user));
                    state.token = res.access_token; state.user = res.user;
                    navigateTo('/dashboard');
                } catch(error) { err.textContent = error.message; err.classList.add('visible'); }
            });
        }

        if (path === '/dashboard') {
            bindDashboardEvents();
            initSocket();
        }

        root.classList.add('visible');
    }, 200);
}

function navigateTo(url) {
    history.pushState(null, null, url);
    handleRoute();
}

function bindLinks() {
    document.querySelectorAll('[data-link]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(e.currentTarget.getAttribute('href'));
        });
    });
}

// --- Init ---
window.addEventListener('popstate', handleRoute);
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    handleRoute();
});
