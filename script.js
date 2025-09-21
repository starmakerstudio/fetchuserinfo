// Create floating particles
function createParticles() {
    const container = document.getElementById('particles');
    const numParticles = 30;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

// Initialize particles on page load
createParticles();

// API configuration
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const API_URL = PROXY_URL + encodeURIComponent('https://starmaker.id.vn/wp-admin/admin-ajax.php');
const NONCE = '17684aaf53';

// Fetch user data from StarMaker API
async function fetchUserData(sid) {
    const formData = new URLSearchParams();
    formData.append('action', 'info_id_sm_fetch');
    formData.append('sid', sid);
    formData.append('nonce', NONCE);
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });
    
    return await response.json();
}

// Format timestamp to readable date
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format numbers with commas
function formatNumber(num) {
    return num ? num.toLocaleString() : '0';
}

// Display user data in the UI
function displayUserData(data) {
    const user = data.share_user;
    const family = data.share_user_family;
    
    const resultContainer = document.getElementById('result');
    
    resultContainer.innerHTML = `
        <div class="result-container">
            <div class="user-header">
                <div class="profile-section">
                    <div style="position: relative;">
                        <img src="${user.profile_image || '/api/placeholder/150/150'}" alt="Profile" class="profile-image" />
                        ${user.is_vip_v2 ? '<div class="vip-badge">VIP</div>' : ''}
                    </div>
                </div>
                <div class="user-details">
                    <h2 class="user-name">${user.stage_name || 'Unknown User'}</h2>
                    <div class="info-item">
                        <span class="info-label">Real Name:</span>
                        <span class="info-value">${user.name || 'Not provided'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">SID:</span>
                        <span class="info-value">${user.sid}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">User ID:</span>
                        <span class="info-value">${user.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Signature:</span>
                        <span class="info-value">${user.signature || 'No signature'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${user.age || 'Not specified'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Hometown:</span>
                        <span class="info-value">${user.hometown || 'Not specified'}</span>
                    </div>
                </div>
            </div>
            
            ${user.v_info && user.v_info.title ? `
                <div class="verification-section">
                    <div class="verification-badges">
                        ${user.v_info.title.map(title => `
                            <div class="badge">
                                <img src="${user.v_info.icon}" alt="Verification" class="badge-icon" />
                                <span>${title.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${user.user_level || 0}</span>
                    <span class="stat-label">User Level</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${formatNumber(user.experience)}</span>
                    <span class="stat-label">Experience</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${formatDate(user.created_on)}</span>
                    <span class="stat-label">Joined</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${user.is_vip_v2 ? 'Yes' : 'No'}</span>
                    <span class="stat-label">VIP Status</span>
                </div>
            </div>
            
            ${family ? `
                <div class="family-section">
                    <h3 class="section-title">Family Information</h3>
                    
                    ${family.cover_url ? `
                        <div class="family-cover">
                            <img src="${family.cover_url}" alt="Family Cover" />
                        </div>
                    ` : ''}
                    
                    <div class="family-info">
                        <div class="info-item">
                            <span class="info-label">Family Name:</span>
                            <span class="info-value">${family.family_name}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Family ID:</span>
                            <span class="info-value">${family.family_id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Level:</span>
                            <span class="info-value">${family.family_level?.level || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Members:</span>
                            <span class="info-value">${family.member_num}/${family.max_member_num}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Online Now:</span>
                            <span class="info-value">${family.online_num}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Rank:</span>
                            <span class="info-value">#${formatNumber(family.rank)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Slogan:</span>
                            <span class="info-value">${family.slogan || 'No slogan'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Region:</span>
                            <span class="info-value">${family.region}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Created:</span>
                            <span class="info-value">${formatDate(family.create_time)}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Show error message
function showError(message) {
    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = `<div class="error">${message}</div>`;
}

// Show/hide loading state
function showLoading(show) {
    const loading = document.getElementById('loading');
    const fetchBtn = document.getElementById('fetchBtn');
    
    if (show) {
        loading.classList.remove('hidden');
        fetchBtn.disabled = true;
        fetchBtn.textContent = 'Loading...';
    } else {
        loading.classList.add('hidden');
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Info';
    }
}

// Main function to handle fetching user data
async function handleFetch() {
    const sidInput = document.getElementById('sidInput');
    const sid = sidInput.value.trim();
    
    // Clear previous results
    document.getElementById('result').innerHTML = '';
    
    // Validate SID input
    if (!sid) {
        showError('Please enter a valid SID');
        return;
    }
    
    if (!/^\d+$/.test(sid)) {
        showError('SID must contain only numbers');
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        const data = await fetchUserData(sid);
        
        if (data.success && data.data) {
            displayUserData(data.data);
        } else {
            showError(data.data?.message || 'User not found or invalid SID');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        showError('Error fetching data. Please check your connection and try again.');
    } finally {
        showLoading(false);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const fetchBtn = document.getElementById('fetchBtn');
    const sidInput = document.getElementById('sidInput');
    
    // Button click event
    fetchBtn.addEventListener('click', handleFetch);
    
    // Enter key event
    sidInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleFetch();
        }
    });
    
    // Input validation - only allow numbers
    sidInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
});
