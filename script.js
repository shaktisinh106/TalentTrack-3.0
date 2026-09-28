// MockAPI Base Endpoint
const API_BASE = "https://6aba8d5c5b549d818d627f0d.mockapi.io";

// Default Mock Job Listings (Offline Fallback)
const defaultFallbackJobs = [
    { id: "1", title: "Frontend Developer", company: "TechCorp", location: "Ahmedabad", type: "Full-Time", education: "B.Tech Computer Engineering", salary: "₹30,000 - ₹40,000 / month", badge: "Urgent" },
    { id: "2", title: "Full Stack Developer", company: "Tech Solutions", location: "Ahmedabad", type: "Full-Time", education: "B.Tech / M.Tech", salary: "₹45,000 - ₹60,000 / month", badge: "Featured" },
    { id: "3", title: "UI/UX Designer", company: "Creative Minds", location: "Remote", type: "Remote", education: "Any Graduate", salary: "₹25,000 - ₹35,000 / month", badge: "New" }
];

// App State Management
let state = {
    jobs: JSON.parse(localStorage.getItem('talenttrack3_jobs')) || defaultFallbackJobs,
    applications: [], // Populated live via MockAPI GET /applications
    users: JSON.parse(localStorage.getItem('talenttrack3_users')) || {},
    currentUser: localStorage.getItem('talenttrack3_active_user') || null,
    theme: localStorage.getItem('talenttrack3_theme') || 'light'
};

// DOM Elements
const jobContainer = document.getElementById('job-container');
const skeletonLoader = document.getElementById('skeleton-loader');
const themeToggle = document.getElementById('theme-toggle');

const loginBtn = document.getElementById('login-btn');
const profileBtn = document.getElementById('profile-btn');
const logoutNavBtn = document.getElementById('logout-nav-btn');
const logoutProfileBtn = document.getElementById('logout-profile-btn');
const navUsername = document.getElementById('nav-username');
const navAvatar = document.getElementById('nav-avatar');

const loginModal = document.getElementById('login-modal');
const postJobModal = document.getElementById('post-job-modal');
const applyModal = document.getElementById('apply-modal');
const profileModal = document.getElementById('profile-modal');
const viewProfileModal = document.getElementById('view-profile-modal');
const applicationsModal = document.getElementById('applications-modal');
const myAppsList = document.getElementById('my-apps-list');

const toast = document.getElementById('toast');

// Theme Controller
document.documentElement.setAttribute('data-theme', state.theme);
themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('talenttrack3_theme', state.theme);
});

// Save Local State Helper
function saveLocalState() {
    localStorage.setItem('talenttrack3_jobs', JSON.stringify(state.jobs));
    localStorage.setItem('talenttrack3_users', JSON.stringify(state.users));
    if (state.currentUser) {
        localStorage.setItem('talenttrack3_active_user', state.currentUser);
    } else {
        localStorage.removeItem('talenttrack3_active_user');
    }
}

// -------------------------------------------------------------
// CRUD Operations via MockAPI (REST Endpoints)
// -------------------------------------------------------------

// [READ - GET /jobs]: Fetch Job Listings
async function fetchJobsFromAPI() {
    try {
        const res = await fetch(`${API_BASE}/jobs`);
        if (!res.ok) throw new Error("Failed to fetch jobs from API");
        const apiJobs = await res.json();
        if (Array.isArray(apiJobs) && apiJobs.length > 0) {
            state.jobs = apiJobs;
            localStorage.setItem('talenttrack3_jobs', JSON.stringify(state.jobs));
        }
    } catch (err) {
        console.warn("API offline or empty, using cached jobs:", err);
    }
}

// [READ - GET /applications]: Fetch Applications for Active User
async function fetchApplicationsFromAPI() {
    if (!state.currentUser) {
        state.applications = [];
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/applications`);
        if (!res.ok) throw new Error("Failed to fetch applications from API");
        const allApps = await res.json();
        // Filter applications for the active logged-in user email
        state.applications = allApps.filter(app => (app.userEmail || '').toLowerCase() === state.currentUser.toLowerCase());
    } catch (err) {
        console.warn("API offline or empty, falling back to local user applications:", err);
        state.applications = state.users[state.currentUser]?.applications || [];
    }
}

// [CREATE - POST /jobs]: Post a New Job Opportunity
async function createJobOnAPI(newJob) {
    try {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newJob)
        });
        if (!res.ok) throw new Error("Failed to create job on API");
        const created = await res.json();
        state.jobs.unshift(created);
    } catch (err) {
        console.warn("API POST failed, saving job locally:", err);
        state.jobs.unshift(newJob);
    }
    saveLocalState();
    updateUI();
}

// [CREATE - POST /applications]: Apply for a Position
async function createApplicationOnAPI(appData) {
    try {
        const res = await fetch(`${API_BASE}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        if (!res.ok) throw new Error("Failed to post application to API");
        const created = await res.json();
        state.applications.push(created);
    } catch (err) {
        console.warn("API application POST failed, keeping local fallback:", err);
        state.applications.push(appData);
    }

    if (state.users[state.currentUser]) {
        state.users[state.currentUser].applications = state.applications;
    }
    saveLocalState();
    updateUI();
}

// [DELETE - DELETE /applications/:id]: Withdraw Application
async function deleteApplicationOnAPI(appId) {
    try {
        const res = await fetch(`${API_BASE}/applications/${appId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete application on API");
    } catch (err) {
        console.warn("API DELETE failed, removing locally:", err);
    }

    // Remove from state
    state.applications = state.applications.filter(app => String(app.id) !== String(appId));
    if (state.users[state.currentUser]) {
        state.users[state.currentUser].applications = state.applications;
    }
    saveLocalState();
    updateUI();
    renderApplicationsList();
    showToast("Application withdrawn successfully!");
}

// -------------------------------------------------------------
// UI Rendering & Component Logic
// -------------------------------------------------------------

// Render Job Catalog with Applied Status
function renderJobs(filterCategory = 'all', searchQuery = '') {
    skeletonLoader.classList.remove('hidden');
    jobContainer.classList.add('hidden');

    setTimeout(() => {
        jobContainer.innerHTML = '';
        const userAppJobIds = state.applications.map(app => String(app.jobId));

        const filtered = state.jobs.filter(job => {
            const matchesCat = filterCategory === 'all' || job.type === filterCategory;
            const matchesSearch = (job.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (job.company || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            jobContainer.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--text-muted);">No job listings available.</p>`;
        } else {
            filtered.forEach(job => {
                const hasApplied = userAppJobIds.includes(String(job.id));
                const card = document.createElement('div');
                card.className = 'job-card';
                card.innerHTML = `
                    <div>
                        ${job.badge ? `<span class="badge badge-${job.badge.toLowerCase()}">${job.badge}</span>` : ''}
                        <div class="job-title">${job.title}</div>
                        <div class="job-company">${job.company} • ${job.location} (${job.type})</div>
                    </div>
                    <button class="btn-primary apply-btn" data-id="${job.id}" ${hasApplied ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
                        ${hasApplied ? 'Applied' : 'Apply Now'}
                    </button>
                `;
                jobContainer.appendChild(card);
            });
        }

        skeletonLoader.classList.add('hidden');
        jobContainer.classList.remove('hidden');
    }, 250);
}

// Render "My Applications" List with Withdraw (Delete) Action
function renderApplicationsList() {
    if (state.applications.length === 0) {
        myAppsList.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 1.5rem 0;">You have not applied to any jobs yet.</p>`;
        return;
    }

    myAppsList.innerHTML = '';
    state.applications.forEach(app => {
        const job = state.jobs.find(j => String(j.id) === String(app.jobId)) || {
            title: "Position Applied",
            company: "Organization",
            location: "Flexible"
        };

        const item = document.createElement('div');
        item.className = 'app-item';
        item.innerHTML = `
            <div class="app-item-info">
                <h3>${job.title}</h3>
                <p><strong>Company:</strong> ${job.company} | <strong>Location:</strong> ${job.location}</p>
                <p><small>Applied Date: ${app.appliedDate || 'Recently'}</small></p>
            </div>
            <button class="btn-withdraw" data-appid="${app.id}" title="Withdraw this application">
                Withdraw
            </button>
        `;
        myAppsList.appendChild(item);
    });

    // Attach Delete Event Listeners
    myAppsList.querySelectorAll('.btn-withdraw').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const appId = e.target.dataset.appid;
            deleteApplicationOnAPI(appId);
        });
    });
}

// Update Header, Stat Badges, and Counters
function updateUI() {
    document.getElementById('stat-total').textContent = state.jobs.length;
    
    if (state.currentUser && state.users[state.currentUser]) {
        const userObj = state.users[state.currentUser];
        const displayName = userObj.loginDetails.name.split(' ')[0] || 'User';
        
        loginBtn.classList.add('hidden');
        profileBtn.classList.remove('hidden');
        logoutNavBtn.classList.remove('hidden');
        navUsername.textContent = `Hi, ${displayName}`;

        if (userObj.profile && userObj.profile.pic) {
            navAvatar.src = userObj.profile.pic;
        } else {
            navAvatar.src = "https://via.placeholder.com/30?text=" + displayName.charAt(0);
        }

        const appCount = state.applications.length;
        document.getElementById('stat-applied').textContent = appCount;
        document.getElementById('user-app-count').textContent = appCount;
    } else {
        loginBtn.classList.remove('hidden');
        profileBtn.classList.add('hidden');
        logoutNavBtn.classList.add('hidden');
        document.getElementById('stat-applied').textContent = '0';
        document.getElementById('user-app-count').textContent = '0';
    }

    renderJobs();
}

// User Profile Initializer
function initUserSession(userObj) {
    const key = userObj.email.toLowerCase();
    state.currentUser = key;
    
    if (!state.users[key]) {
        state.users[key] = {
            loginDetails: userObj,
            profile: null,
            applications: []
        };
    } else {
        state.users[key].loginDetails = userObj;
    }
    
    saveLocalState();
    fetchApplicationsFromAPI().then(() => {
        updateUI();
        showToast(`Welcome, ${userObj.name}!`);
    });
}

// Logout Handler
function handleLogout() {
    state.currentUser = null;
    state.applications = [];
    saveLocalState();
    updateUI();
    viewProfileModal.classList.add('hidden');
    showToast("Logged out successfully!");
}

logoutNavBtn.addEventListener('click', handleLogout);
logoutProfileBtn.addEventListener('click', handleLogout);

// Event Listeners: Login Form
loginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const mobile = document.getElementById('login-mobile').value.trim();
    const email = document.getElementById('login-email').value.trim();

    initUserSession({ name, mobile, email });
    loginModal.classList.add('hidden');
    e.target.reset();
});

// Profile Handler (Create or View)
profileBtn.addEventListener('click', () => {
    const userObj = state.users[state.currentUser];
    if (userObj && userObj.profile) {
        const p = userObj.profile;
        document.getElementById('view-prof-name').textContent = p.fullname;
        document.getElementById('view-prof-email').textContent = p.email;
        document.getElementById('view-prof-mobile').textContent = p.mobile;
        document.getElementById('view-prof-address').textContent = p.address;
        document.getElementById('view-prof-edu').textContent = p.edu;
        document.getElementById('view-prof-exp').textContent = p.exp || 'None Specified';
        document.getElementById('view-prof-pic').src = p.pic || "https://via.placeholder.com/100?text=" + p.fullname.charAt(0);
        viewProfileModal.classList.remove('hidden');
    } else {
        if (userObj) {
            document.getElementById('prof-fullname').value = userObj.loginDetails.name;
            document.getElementById('prof-mobile').value = userObj.loginDetails.mobile;
            document.getElementById('prof-email').value = userObj.loginDetails.email;
        }
        profileModal.classList.remove('hidden');
    }
});

document.getElementById('edit-profile-btn').addEventListener('click', () => {
    viewProfileModal.classList.add('hidden');
    const p = state.users[state.currentUser].profile;
    document.getElementById('prof-fullname').value = p.fullname;
    document.getElementById('prof-address').value = p.address;
    document.getElementById('prof-edu').value = p.edu;
    document.getElementById('prof-mobile').value = p.mobile;
    document.getElementById('prof-email').value = p.email;
    document.getElementById('prof-exp').value = p.exp || '';
    profileModal.classList.remove('hidden');
});

// Profile Validation & Update (CRUD: Update Profile)
let profilePicBase64 = null;
document.getElementById('profile-pic').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            profilePicBase64 = evt.target.result;
            document.getElementById('profile-pic-preview').src = profilePicBase64;
            document.getElementById('pic-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const fullname = document.getElementById('prof-fullname').value.trim();
    const address = document.getElementById('prof-address').value.trim();
    const edu = document.getElementById('prof-edu').value.trim();
    const mobile = document.getElementById('prof-mobile').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const exp = document.getElementById('prof-exp').value.trim();

    const nameRegex = /^[a-zA-Z\s]+$/;
    const mobileRegex = /^[0-9]{10}$/;
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    if (!nameRegex.test(fullname)) {
        document.getElementById('err-fullname').textContent = "Full Name must contain letters only.";
        valid = false;
    } else { document.getElementById('err-fullname').textContent = ""; }

    if (!mobileRegex.test(mobile)) {
        document.getElementById('err-mobile').textContent = "Please enter a 10-digit mobile number.";
        valid = false;
    } else { document.getElementById('err-mobile').textContent = ""; }

    if (!gmailRegex.test(email)) {
        document.getElementById('err-email').textContent = "Please enter a valid Gmail address (@gmail.com).";
        valid = false;
    } else { document.getElementById('err-email').textContent = ""; }

    if (valid) {
        state.users[state.currentUser].profile = {
            fullname, address, edu, mobile, email, exp, pic: profilePicBase64
        };
        saveLocalState();
        updateUI();
        profileModal.classList.add('hidden');
        showToast("Profile updated successfully!");
    }
});

// My Applications Button
document.getElementById('applications-nav-btn').addEventListener('click', async () => {
    if (!state.currentUser) {
        showToast("Please log in to view your applications.");
        loginModal.classList.remove('hidden');
        return;
    }
    await fetchApplicationsFromAPI();
    renderApplicationsList();
    applicationsModal.classList.remove('hidden');
});

// Post Job Form Handler (CRUD: Create Job)
document.getElementById('post-job-btn').addEventListener('click', () => postJobModal.classList.remove('hidden'));

document.getElementById('post-job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('post-job-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";

    const newJob = {
        title: document.getElementById('job-title').value.trim(),
        company: document.getElementById('job-company').value.trim(),
        location: document.getElementById('job-location').value.trim(),
        type: document.getElementById('job-type').value,
        education: document.getElementById('job-education').value.trim(),
        salary: document.getElementById('job-salary').value.trim(),
        badge: "New"
    };

    await createJobOnAPI(newJob);
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Job to Cloud";
    postJobModal.classList.add('hidden');
    e.target.reset();
    showToast("Job opportunity posted via MockAPI!");
});

// Apply Job Flow
let selectedJobId = null;
jobContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('apply-btn') && !e.target.disabled) {
        if (!state.currentUser) {
            showToast("Please log in first to apply!");
            loginModal.classList.remove('hidden');
            return;
        }

        selectedJobId = e.target.dataset.id;
        const job = state.jobs.find(j => String(j.id) === String(selectedJobId));

        if (job) {
            document.getElementById('view-job-title').textContent = job.title;
            document.getElementById('view-job-company').textContent = job.company;
            document.getElementById('view-job-location').textContent = job.location;
            document.getElementById('view-job-education').textContent = job.education || 'Graduate Degree';
            document.getElementById('view-job-salary').textContent = job.salary || 'Negotiable';
            applyModal.classList.remove('hidden');
        }
    }
});

// Resume Upload Progress Handler
const resumeInput = document.getElementById('resume-input');
const filePreview = document.getElementById('file-preview');
const fileNameSpan = document.getElementById('file-name');
const fileSizeSpan = document.getElementById('file-size');
const progressFill = document.getElementById('progress-fill');
const submitAppBtn = document.getElementById('submit-app-btn');

resumeInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        filePreview.classList.remove('hidden');
        fileNameSpan.textContent = file.name;
        fileSizeSpan.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        progressFill.style.width = '0%';
        submitAppBtn.disabled = true;

        setTimeout(() => { progressFill.style.width = '100%'; submitAppBtn.disabled = false; }, 400);
    }
});

document.getElementById('apply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    submitAppBtn.disabled = true;
    submitAppBtn.textContent = "Submitting...";

    const newApp = {
        jobId: String(selectedJobId),
        userName: state.users[state.currentUser]?.loginDetails?.name || 'Applicant',
        userEmail: state.currentUser,
        appliedDate: new Date().toLocaleDateString('en-GB')
    };

    await createApplicationOnAPI(newApp);

    submitAppBtn.disabled = false;
    submitAppBtn.textContent = "Apply Now";
    applyModal.classList.add('hidden');
    filePreview.classList.add('hidden');
    document.getElementById('apply-form').reset();
    showToast("Application submitted to MockAPI!");
});

// Search and Filter Events
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderJobs(e.target.dataset.category, document.getElementById('search-input').value);
    });
});

document.getElementById('search-input').addEventListener('input', (e) => {
    const activeCat = document.querySelector('.filter-btn.active').dataset.category;
    renderJobs(activeCat, e.target.value);
});

// Modal Close Handlers
document.querySelectorAll('.modal').forEach(modal => {
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.classList.add('hidden');
        });
    }
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});

// Toast Helper
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// App Boot Initialization
async function initializeApp() {
    await fetchJobsFromAPI();
    if (state.currentUser) {
        await fetchApplicationsFromAPI();
    }
    updateUI();
}

initializeApp();