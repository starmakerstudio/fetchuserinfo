// Create floating particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return; // Safety check
    
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

// API configuration
const API_BASE_URL = 'https://starmaker.id.vn/wp-admin/admin-ajax.php';

// Get fresh nonce from the API
async function getFreshNonce() {
    try {
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_get_nonce');
        
        // Sending the POST request for nonce
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': '/',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Origin': 'https://starmaker.id.vn',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Referer': 'https://starmaker.id.vn/',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Nonce response:', data);

        return data.success ? data.data.nonce : '17684aaf53'; // fallback nonce
    } catch (error) {
        console.warn('Failed to get fresh nonce:', error);
        return '17684aaf53'; // fallback nonce
    }
}

// Fetch user data from StarMaker API
async function fetchUserData(sid) {
    try {
        const nonce = await getFreshNonce();
        console.log('Using nonce:', nonce);

        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('User data response:', data);

        return data;
    } catch (error) {
        console.warn('Direct API call failed, trying proxy method:', error);
        return await fetchUserDataWithProxy(sid); // Fallback to proxy method
    }
}

// Alternative fetch method using CORS proxy if direct API fails
async function fetchUserDataWithProxy(sid) {
    try {
        const PROXY_URL = 'https://api.allorigins.win/get?url=';
        const nonce = '17684aaf53'; // Use default nonce for proxy method

        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetch(PROXY_URL + API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error with proxy method:', error);
        throw error;
    }
}

// Format timestamp to readable date
function formatDate(timestamp) {
    if (!timestamp) return 'Not available';
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

// Safe image URL handler
function getSafeImageUrl(url, defaultUrl = 'https://via.placeholder.com/150x150?text=No+Image') {
    if (!url || url.includes('placeholder')) {
        return defaultUrl;
    }
    return url;
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
                        <img src="${getSafeImageUrl(user.profile_image)}" 
                             alt="Profile" 
                             class="profile-image" 
                             onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'" />
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
                                <img src="${getSafeImageUrl(user.v_info.icon)}" 
                                     alt="Verification" 
                                     class="badge-icon" 
                                     onerror="this.style.display='none'" />
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
                            <img src="${getSafeImageUrl(family.cover_url)}" 
                                 alt="Family Cover" 
                                 onerror="this.style.display='none'" />
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
                            <span class="info-value">${family.region || 'Not specified'}</span>
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
    resultContainer.innerHTML = `
        <div class="error">
            <h3>Error</h3>
            <p>${message}</p>
            <small>If CORS errors occur, you may need to run this from a server or use a CORS proxy.</small>
        </div>
    `;
}

// Show/hide loading state
function showLoading(show) {
    const loading = document.getElementById('loading');
    const fetchBtn = document.getElementById('fetchBtn');
    
    if (show) {
        if (loading) loading.classList.remove('hidden');
        if (fetchBtn) {
            fetchBtn.disabled = true;
            fetchBtn.textContent = 'Loading...';
        }
    } else {
        if (loading) loading.classList.add('hidden');
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Fetch Info';
        }
    }
}

// Validate SID input
function validateSID(sid) {
    if (!sid || sid.trim() === '') {
        return { valid: false, message: 'Please enter a valid SID' };
    }
    
    if (!/^\d+$/.test(sid.trim())) {
        return { valid: false, message: 'SID must contain only numbers' };
    }
    
    if (sid.trim().length < 5) {
        return { valid: false, message: 'SID must be at least 5 digits long' };
    }
    
    return { valid: true };
}

// Main function to handle fetching user data
async function handleFetch() {
    const sidInput = document.getElementById('sidInput');
    const sid = sidInput?.value?.trim();
    
    // Clear previous results
    const resultContainer = document.getElementById('result');
    if (resultContainer) resultContainer.innerHTML = '';
    
    // Validate SID input
    const validation = validateSID(sid);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    try {
        // Try direct API call first
        let data;
        try {
            data = await fetchUserData(sid);
        } catch (directError) {
            console.warn('Direct API call failed, trying proxy method:', directError);
            // Fallback to proxy method
            data = await fetchUserDataWithProxy(sid);
        }
        
        console.log('Final API Response:', data);
        
        if (data.success && data.data) {
            displayUserData(data.data);
        } else {
            const errorMsg = data.message || data.error || 'User not found or invalid SID';
            showError(`API Error: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        let errorMessage = 'Error fetching data. ';
        
        if (error.message.includes('CORS')) {
            errorMessage += 'CORS policy is blocking the request. You may need to run this from a server.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Network error. Please check your internet connection.';
        } else {
            errorMessage += 'Please try again later.';
        }
        
        showError(errorMessage);
    } finally {
        showLoading(false);
    }
}

// Initialize the application
function initializeApp() {
    // Create particles if container exists
    createParticles();
    
    // Set up event listeners
    const fetchBtn = document.getElementById('fetchBtn');
    const sidInput = document.getElementById('sidInput');
    
    if (fetchBtn) {
        fetchBtn.addEventListener('click', handleFetch);
    }
    
    if (sidInput) {
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
        
        // Add placeholder if not already set
        if (!sidInput.placeholder) {
            sidInput.placeholder = 'Enter StarMaker SID (numbers only)';
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', initializeApp);

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
