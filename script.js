// Create floating particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return; // Safety check
    
    // Clear existing particles
    container.innerHTML = '';
    
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

// API configuration - Updated with better error handling
const API_BASE_URL = 'https://starmaker-proxy.onrender.com/api';
const BACKUP_API_URL = 'https://starmaker.id.vn/wp-admin/admin-ajax.php';

// Enhanced nonce fetching with retry logic
async function getFreshNonce(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempting to get nonce (attempt ${attempt}/${retries})`);
            
            const formData = new URLSearchParams();
            formData.append('action', 'info_id_sm_get_nonce');
            
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://starmaker.id.vn',
                    'Referer': 'https://starmaker.id.vn/',
                },
                body: formData,
                timeout: 15000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Nonce response:', data);

            if (data.success && data.data && data.data.nonce) {
                return data.data.nonce;
            } else {
                throw new Error('Invalid nonce response format');
            }
        } catch (error) {
            console.warn(`Nonce attempt ${attempt} failed:`, error.message);
            
            if (attempt === retries) {
                console.warn('All nonce attempts failed, using fallback');
                return '17684aaf53'; // fallback nonce
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Enhanced fetch with better error handling and timeout
async function fetchWithTimeout(url, options, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

// Primary fetch method with enhanced error handling
async function fetchUserData(sid) {
    try {
        console.log('Fetching user data for SID:', sid);
        
        const nonce = await getFreshNonce();
        console.log('Using nonce:', nonce);

        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetchWithTimeout(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://starmaker.id.vn',
                'Referer': 'https://starmaker.id.vn/',
            },
            body: formData
        }, 20000);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('User data response:', data);

        return data;
    } catch (error) {
        console.warn('Primary fetch failed:', error.message);
        throw error;
    }
}

// Fallback method using CORS proxy
async function fetchUserDataWithProxy(sid) {
    try {
        console.log('Using proxy fallback method');
        
        const PROXY_URL = 'https://api.allorigins.win/get?url=';
        const encodedUrl = encodeURIComponent(BACKUP_API_URL);
        
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', '17684aaf53');

        const response = await fetchWithTimeout(`${PROXY_URL}${encodedUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        }, 25000);

        if (!response.ok) {
            throw new Error(`Proxy HTTP ${response.status}: ${response.statusText}`);
        }

        const proxyData = await response.json();
        
        if (proxyData.contents) {
            return JSON.parse(proxyData.contents);
        } else {
            throw new Error('Invalid proxy response format');
        }
    } catch (error) {
        console.error('Proxy method failed:', error.message);
        throw error;
    }
}

// Direct API call as last resort - ALWAYS get fresh nonce
async function fetchUserDataDirect(sid) {
    try {
        console.log('Attempting direct API call - getting fresh nonce...');
        
        // Step 1: Get fresh nonce directly
        console.log('Getting fresh nonce via direct API...');
        const nonceFormData = new URLSearchParams();
        nonceFormData.append('action', 'info_id_sm_get_nonce');

        const nonceResponse = await fetchWithTimeout(BACKUP_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: nonceFormData
        }, 15000);

        if (!nonceResponse.ok) {
            throw new Error(`Direct nonce HTTP ${nonceResponse.status}: ${nonceResponse.statusText}`);
        }

        const nonceData = await nonceResponse.json();
        let nonce;
        
        if (nonceData.success && nonceData.data && nonceData.data.nonce) {
            nonce = nonceData.data.nonce;
            console.log('Fresh nonce obtained via direct API:', nonce);
        } else {
            throw new Error('Invalid nonce response format from direct API');
        }

        // Step 2: Use fresh nonce to fetch user data
        console.log('Fetching user data with fresh nonce via direct API...');
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetchWithTimeout(BACKUP_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: formData
        }, 15000);

        if (!response.ok) {
            throw new Error(`Direct HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Direct API call failed:', error.message);
        throw error;
    }
}

// Format timestamp to readable date
function formatDate(timestamp) {
    if (!timestamp) return 'Not available';
    try {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

// Format numbers with commas
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString();
}

// Enhanced safe image URL handler
function getSafeImageUrl(url, defaultUrl = 'https://via.placeholder.com/150x150/4f46e5/ffffff?text=No+Image') {
    if (!url || url.includes('placeholder') || url === '') {
        return defaultUrl;
    }
    
    // Handle relative URLs
    if (url.startsWith('//')) {
        return 'https:' + url;
    } else if (url.startsWith('/')) {
        return 'https://starmaker.id.vn' + url;
    }
    
    return url;
}

// Enhanced display function with better error handling
function displayUserData(data) {
    try {
        const user = data.share_user;
        const family = data.share_user_family;
        
        if (!user) {
            throw new Error('Invalid user data structure');
        }
        
        const resultContainer = document.getElementById('result');
        if (!resultContainer) {
            throw new Error('Result container not found');
        }
        
        const vipBadge = user.is_vip_v2 ? '<div class="vip-badge">VIP</div>' : '';
        const profileImage = getSafeImageUrl(user.profile_image);
        
        resultContainer.innerHTML = `
            <div class="result-container">
                <div class="user-header">
                    <div class="profile-section">
                        <div style="position: relative;">
                            <img src="${profileImage}" 
                                 alt="Profile" 
                                 class="profile-image" 
                                 onerror="this.src='https://via.placeholder.com/150x150/4f46e5/ffffff?text=No+Image'" />
                            ${vipBadge}
                        </div>
                    </div>
                    <div class="user-details">
                        <h2 class="user-name">${escapeHtml(user.stage_name || 'Unknown User')}</h2>
                        <div class="info-item">
                            <span class="info-label">Real Name:</span>
                            <span class="info-value">${escapeHtml(user.name || 'Not provided')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">SID:</span>
                            <span class="info-value">${escapeHtml(user.sid || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">User ID:</span>
                            <span class="info-value">${escapeHtml(user.id || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Signature:</span>
                            <span class="info-value">${escapeHtml(user.signature || 'No signature')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Age:</span>
                            <span class="info-value">${escapeHtml(user.age || 'Not specified')}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Hometown:</span>
                            <span class="info-value">${escapeHtml(user.hometown || 'Not specified')}</span>
                        </div>
                    </div>
                </div>
                
                ${generateVerificationSection(user)}
                
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
                
                ${generateFamilySection(family)}
            </div>
        `;
    } catch (error) {
        console.error('Error displaying user data:', error);
        showError('Error displaying user information: ' + error.message);
    }
}

// Helper function to generate verification section
function generateVerificationSection(user) {
    if (!user.v_info || !user.v_info.title || !Array.isArray(user.v_info.title)) {
        return '';
    }
    
    const badges = user.v_info.title.map(title => `
        <div class="badge">
            <img src="${getSafeImageUrl(user.v_info.icon)}" 
                 alt="Verification" 
                 class="badge-icon" 
                 onerror="this.style.display='none'" />
            <span>${escapeHtml(title.text || '')}</span>
        </div>
    `).join('');
    
    return `
        <div class="verification-section">
            <div class="verification-badges">
                ${badges}
            </div>
        </div>
    `;
}

// Helper function to generate family section
function generateFamilySection(family) {
    if (!family) return '';
    
    const familyCover = family.cover_url ? `
        <div class="family-cover">
            <img src="${getSafeImageUrl(family.cover_url)}" 
                 alt="Family Cover" 
                 onerror="this.style.display='none'" />
        </div>
    ` : '';
    
    return `
        <div class="family-section">
            <h3 class="section-title">Family Information</h3>
            
            ${familyCover}
            
            <div class="family-info">
                <div class="info-item">
                    <span class="info-label">Family Name:</span>
                    <span class="info-value">${escapeHtml(family.family_name || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Family ID:</span>
                    <span class="info-value">${escapeHtml(family.family_id || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Level:</span>
                    <span class="info-value">${family.family_level?.level || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Members:</span>
                    <span class="info-value">${family.member_num || 0}/${family.max_member_num || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Online Now:</span>
                    <span class="info-value">${family.online_num || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Rank:</span>
                    <span class="info-value">#${formatNumber(family.rank || 0)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Slogan:</span>
                    <span class="info-value">${escapeHtml(family.slogan || 'No slogan')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Region:</span>
                    <span class="info-value">${escapeHtml(family.region || 'Not specified')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Created:</span>
                    <span class="info-value">${formatDate(family.create_time)}</span>
                </div>
            </div>
        </div>
    `;
}

// HTML escape function for security
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Enhanced error display
function showError(message) {
    const resultContainer = document.getElementById('result');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="error">
            <h3>⚠️ Error</h3>
            <p>${escapeHtml(message)}</p>
            <div class="error-suggestions">
                <h4>Troubleshooting:</h4>
                <ul>
                    <li>Check that the SID is correct and exists</li>
                    <li>Ensure you have a stable internet connection</li>
                    <li>Try again in a few moments</li>
                    <li>If CORS errors persist, the proxy server might be down</li>
                </ul>
            </div>
        </div>
    `;
}

// Enhanced loading state management
function showLoading(show) {
    const loading = document.getElementById('loading');
    const fetchBtn = document.getElementById('fetchBtn');
    const sidInput = document.getElementById('sidInput');
    
    if (show) {
        if (loading) loading.classList.remove('hidden');
        if (fetchBtn) {
            fetchBtn.disabled = true;
            fetchBtn.textContent = 'Loading...';
            fetchBtn.classList.add('loading');
        }
        if (sidInput) {
            sidInput.disabled = true;
        }
    } else {
        if (loading) loading.classList.add('hidden');
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.textContent = 'Fetch Info';
            fetchBtn.classList.remove('loading');
        }
        if (sidInput) {
            sidInput.disabled = false;
        }
    }
}

// Enhanced SID validation
function validateSID(sid) {
    if (!sid || sid.trim() === '') {
        return { valid: false, message: 'Please enter a valid SID' };
    }
    
    const cleanSID = sid.trim();
    
    if (!/^\d+$/.test(cleanSID)) {
        return { valid: false, message: 'SID must contain only numbers' };
    }
    
    if (cleanSID.length < 5) {
        return { valid: false, message: 'SID must be at least 5 digits long' };
    }
    
    if (cleanSID.length > 20) {
        return { valid: false, message: 'SID seems too long (max 20 digits)' };
    }
    
    return { valid: true };
}

// Main function with cascade fallback strategy
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
    
    const methods = [
        { name: 'Primary API', func: () => fetchUserData(sid) },
        { name: 'Proxy Method', func: () => fetchUserDataWithProxy(sid) },
        { name: 'Direct API', func: () => fetchUserDataDirect(sid) }
    ];
    
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        
        try {
            console.log(`Trying ${method.name}...`);
            const data = await method.func();
            
            console.log(`${method.name} response:`, data);
            
            if (data && data.success && data.data) {
                displayUserData(data.data);
                return;
            } else {
                const errorMsg = data?.message || data?.error || 'Invalid response format';
                throw new Error(`${method.name}: ${errorMsg}`);
            }
        } catch (error) {
            console.warn(`${method.name} failed:`, error.message);
            
            if (i === methods.length - 1) {
                // All methods failed
                let errorMessage = 'All fetch methods failed. ';
                
                if (error.message.includes('timeout')) {
                    errorMessage += 'The request timed out. Please try again.';
                } else if (error.message.includes('CORS')) {
                    errorMessage += 'CORS policy blocked the request.';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage += 'Network error. Check your connection.';
                } else if (error.message.includes('not found') || error.message.includes('404')) {
                    errorMessage += 'User not found. Check the SID.';
                } else {
                    errorMessage += 'Please try again later.';
                }
                
                showError(errorMessage);
            }
        }
    }
    
    showLoading(false);
}

// Enhanced initialization
function initializeApp() {
    console.log('Initializing StarMaker Info Fetcher...');
    
    // Create particles if container exists
    try {
        createParticles();
    } catch (error) {
        console.warn('Failed to create particles:', error);
    }
    
    // Set up event listeners
    const fetchBtn = document.getElementById('fetchBtn');
    const sidInput = document.getElementById('sidInput');
    
    if (fetchBtn) {
        fetchBtn.addEventListener('click', handleFetch);
        console.log('Fetch button listener added');
    }
    
    if (sidInput) {
        // Enter key event
        sidInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
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
        
        console.log('SID input listeners added');
    }
    
    console.log('App initialization complete');
}

// Event listeners with better error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializeApp();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    try {
        initializeApp();
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Global error handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please try again.');
});

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});
