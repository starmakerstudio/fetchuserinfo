// Create floating particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
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

// API Configuration
const API_BASE_URL = 'https://starmaker-proxy.onrender.com/api';
const BACKUP_API_URL = 'https://starmaker.id.vn/wp-admin/admin-ajax.php';

// Global state for nonce management
let currentNonce = null;
let nonceTimestamp = null;
const NONCE_LIFETIME = 5 * 60 * 1000; // 5 minutes

// Enhanced fetch with timeout and retry
async function fetchWithTimeout(url, options, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...options.headers
            }
        });
        
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after ' + (timeoutMs / 1000) + ' seconds');
        }
        throw error;
    }
}

// Test API connectivity
async function testAPIConnectivity() {
    try {
        console.log('🔍 Testing API connectivity...');
        const response = await fetchWithTimeout(`${API_BASE_URL.replace('/api', '')}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }, 10000);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API server status:', data.status);
            return { success: true, data };
        } else {
            console.warn('⚠️ API server returned:', response.status, response.statusText);
            return { success: false, error: `Server returned ${response.status}` };
        }
    } catch (error) {
        console.error('❌ API server unreachable:', error.message);
        return { success: false, error: error.message };
    }
}

// Check if nonce is still valid
function isNonceValid() {
    if (!currentNonce || !nonceTimestamp) {
        return false;
    }
    
    const age = Date.now() - nonceTimestamp;
    return age < NONCE_LIFETIME;
}

// Get fresh nonce with improved error handling
async function getFreshNonce(retries = 3) {
    // Check if current nonce is still valid
    if (isNonceValid()) {
        console.log('🔄 Using cached valid nonce');
        return currentNonce;
    }
    
    console.log('🔑 Getting fresh nonce...');
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`📡 Nonce request attempt ${attempt}/${retries}`);
            
            const formData = new URLSearchParams();
            formData.append('action', 'info_id_sm_get_nonce');
            
            const response = await fetchWithTimeout(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://starmaker.id.vn',
                    'Referer': 'https://starmaker.id.vn/',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            }, 20000);

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No response text');
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse nonce response:', responseText.substring(0, 200));
                throw new Error('Invalid JSON response from server');
            }

            console.log('📥 Nonce response:', data);

            if (data.success && data.data && data.data.nonce) {
                currentNonce = data.data.nonce;
                nonceTimestamp = Date.now();
                console.log(`🎯 Fresh nonce obtained: ${currentNonce}`);
                return currentNonce;
            } else {
                throw new Error(`Invalid nonce response: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.warn(`⚠️ Nonce attempt ${attempt} failed:`, error.message);
            
            if (attempt === retries) {
                // Clear invalid cached nonce
                currentNonce = null;
                nonceTimestamp = null;
                throw new Error(`Failed to get fresh nonce after ${retries} attempts: ${error.message}`);
            }
            
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Primary fetch method with improved error handling
async function fetchUserData(sid) {
    try {
        console.log('🚀 Fetching user data for SID:', sid);
        
        // Get fresh nonce
        const nonce = await getFreshNonce();
        
        console.log('📤 Making user data request...');
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetchWithTimeout(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://starmaker.id.vn',
                'Referer': 'https://starmaker.id.vn/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        }, 25000);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No response text');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Failed to parse user data response:', responseText.substring(0, 200));
            throw new Error('Invalid JSON response from server');
        }

        console.log('📥 User data response:', data);
        
        // Handle different response formats
        if (data.success === false) {
            // If nonce is invalid, clear it and throw specific error
            if (data.message && data.message.toLowerCase().includes('nonce')) {
                currentNonce = null;
                nonceTimestamp = null;
                throw new Error('Nonce expired - please try again');
            }
            throw new Error(data.message || 'API returned error');
        }
        
        return data;
    } catch (error) {
        console.warn('⚠️ Primary fetch failed:', error.message);
        
        // Clear nonce on certain errors
        if (error.message.includes('nonce') || error.message.includes('invalid')) {
            currentNonce = null;
            nonceTimestamp = null;
        }
        
        throw error;
    }
}

// Backup method - Direct API call
async function fetchUserDataDirect(sid) {
    try {
        console.log('🎯 Direct method: Attempting direct API call...');
        
        // Step 1: Get nonce directly
        const nonceFormData = new URLSearchParams();
        nonceFormData.append('action', 'info_id_sm_get_nonce');

        const nonceResponse = await fetchWithTimeout(BACKUP_API_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Origin': 'https://starmaker.id.vn',
                'Referer': 'https://starmaker.id.vn/',
            },
            body: nonceFormData
        }, 20000);

        if (!nonceResponse.ok) {
            throw new Error(`Direct nonce HTTP ${nonceResponse.status}: ${nonceResponse.statusText}`);
        }

        const nonceData = await nonceResponse.json();
        
        if (!nonceData.success || !nonceData.data?.nonce) {
            throw new Error('Invalid nonce response from direct API');
        }
        
        const nonce = nonceData.data.nonce;
        console.log(`🎯 Direct nonce obtained: ${nonce}`);

        // Step 2: Fetch user data
        console.log('📤 Making direct user data request...');
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetchWithTimeout(BACKUP_API_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Origin': 'https://starmaker.id.vn',
                'Referer': 'https://starmaker.id.vn/',
            },
            body: formData
        }, 20000);

        if (!response.ok) {
            throw new Error(`Direct HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Direct method failed:', error.message);
        throw error;
    }
}

// Proxy method using CORS proxy
async function fetchUserDataWithProxy(sid) {
    try {
        console.log('🔄 Proxy method: Using CORS proxy...');
        
        const PROXY_URL = 'https://api.allorigins.win/get?url=';
        const encodedUrl = encodeURIComponent(BACKUP_API_URL);
        
        // Step 1: Get nonce via proxy
        const nonceFormData = new URLSearchParams();
        nonceFormData.append('action', 'info_id_sm_get_nonce');

        const nonceResponse = await fetchWithTimeout(`${PROXY_URL}${encodedUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: nonceFormData
        }, 30000);

        if (!nonceResponse.ok) {
            throw new Error(`Proxy nonce HTTP ${nonceResponse.status}: ${nonceResponse.statusText}`);
        }

        const nonceProxyData = await nonceResponse.json();
        let nonce;
        
        if (nonceProxyData.contents) {
            const nonceData = JSON.parse(nonceProxyData.contents);
            if (nonceData.success && nonceData.data && nonceData.data.nonce) {
                nonce = nonceData.data.nonce;
                console.log(`🎯 Proxy nonce obtained: ${nonce}`);
            } else {
                throw new Error('Invalid nonce response from proxy');
            }
        } else {
            throw new Error('Invalid proxy nonce response');
        }

        // Step 2: Fetch user data via proxy
        console.log('📤 Making proxy user data request...');
        const formData = new URLSearchParams();
        formData.append('action', 'info_id_sm_fetch');
        formData.append('sid', sid);
        formData.append('nonce', nonce);

        const response = await fetchWithTimeout(`${PROXY_URL}${encodedUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        }, 30000);

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
        console.error('❌ Proxy method failed:', error.message);
        throw error;
    }
}

// Utility functions
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

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString();
}

function getSafeImageUrl(url, defaultUrl = 'https://via.placeholder.com/150x150/4f46e5/ffffff?text=No+Image') {
    if (!url || url.includes('placeholder') || url === '') {
        return defaultUrl;
    }
    
    if (url.startsWith('//')) {
        return 'https:' + url;
    } else if (url.startsWith('/')) {
        return 'https://starmaker.id.vn' + url;
    }
    
    return url;
}

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

// Generate verification section
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

// Generate family section
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

// Enhanced display function
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
        
        console.log('✅ User data displayed successfully');
    } catch (error) {
        console.error('❌ Error displaying user data:', error);
        showError('Error displaying user information: ' + error.message);
    }
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
                    <li>Verify the SID is correct (numbers only, 5-20 digits)</li>
                    <li>Check your internet connection</li>
                    <li>The user might not exist or be private</li>
                    <li>Try again in a few moments</li>
                    <li>Clear your browser cache if issues persist</li>
                </ul>
            </div>
        </div>
    `;
}

// Enhanced loading state management
function showLoading(show) {
    const elements = {
        loading: document.getElementById('loading'),
        fetchBtn: document.getElementById('fetchBtn'),
        sidInput: document.getElementById('sidInput')
    };
    
    if (show) {
        elements.loading?.classList.remove('hidden');
        if (elements.fetchBtn) {
            elements.fetchBtn.disabled = true;
            elements.fetchBtn.textContent = 'Fetching...';
            elements.fetchBtn.classList.add('loading');
        }
        if (elements.sidInput) {
            elements.sidInput.disabled = true;
        }
    } else {
        elements.loading?.classList.add('hidden');
        if (elements.fetchBtn) {
            elements.fetchBtn.disabled = false;
            elements.fetchBtn.textContent = 'Fetch Info';
            elements.fetchBtn.classList.remove('loading');
        }
        if (elements.sidInput) {
            elements.sidInput.disabled = false;
            elements.sidInput.focus();
        }
    }
}

// Enhanced SID validation
function validateSID(sid) {
    if (!sid || sid.trim() === '') {
        return { valid: false, message: 'Please enter a StarMaker SID' };
    }
    
    const cleanSID = sid.trim();
    
    if (!/^\d+$/.test(cleanSID)) {
        return { valid: false, message: 'SID must contain only numbers' };
    }
    
    if (cleanSID.length < 5) {
        return { valid: false, message: 'SID must be at least 5 digits long' };
    }
    
    if (cleanSID.length > 20) {
        return { valid: false, message: 'SID is too long (maximum 20 digits)' };
    }
    
    // Check for obviously invalid patterns
    if (/^0+$/.test(cleanSID)) {
        return { valid: false, message: 'SID cannot be all zeros' };
    }
    
    return { valid: true };
}

// Main fetch function with cascade fallback
async function handleFetch() {
    const sidInput = document.getElementById('sidInput');
    const sid = sidInput?.value?.trim();
    
    // Clear previous results
    const resultContainer = document.getElementById('result');
    if (resultContainer) resultContainer.innerHTML = '';
    
    // Validate SID
    const validation = validateSID(sid);
    if (!validation.valid) {
        showError(validation.message);
        return;
    }
    
    // Show loading state
    showLoading(true);
    
    const methods = [
        { 
            name: 'Primary API Server', 
            func: () => fetchUserData(sid),
            priority: 1 
        },
        { 
            name: 'Direct API Call', 
            func: () => fetchUserDataDirect(sid),
            priority: 2 
        },
        { 
            name: 'CORS Proxy', 
            func: () => fetchUserDataWithProxy(sid),
            priority: 3 
        }
    ];
    
    let lastError = null;
    
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        
        try {
            console.log(`🚀 Attempting ${method.name} (Priority ${method.priority})...`);
            const startTime = Date.now();
            
            const data = await method.func();
            const duration = Date.now() - startTime;
            
            console.log(`✅ ${method.name} successful in ${duration}ms:`, data);
            
            // Validate response structure
            if (!data) {
                throw new Error('Empty response received');
            }
            
            if (data.success === false) {
                throw new Error(data.message || 'API returned error');
            }
            
            if (data.success && data.data) {
                displayUserData(data.data);
                showLoading(false);
                return;
            } else if (data.share_user) {
                // Handle direct response format
                displayUserData(data);
                showLoading(false);
                return;
            } else {
                throw new Error('Invalid response format - missing user data');
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ ${method.name} failed:`, error.message);
            
            // If it's a nonce error and we have more methods, clear the nonce
            if (error.message.toLowerCase().includes('nonce') && i < methods.length - 1) {
                currentNonce = null;
                nonceTimestamp = null;
                console.log('🔄 Cleared invalid nonce, will retry with fresh nonce');
            }
        }
    }
    
    // All methods failed
    showLoading(false);
    let errorMessage = '💥 Unable to fetch user data. ';
    
    if (lastError) {
        if (lastError.message.includes('timeout')) {
            errorMessage += 'Request timed out - the server may be overloaded.';
        } else if (lastError.message.includes('nonce')) {
            errorMessage += 'Security token issues - please try again.';
        } else if (lastError.message.includes('CORS')) {
            errorMessage += 'Browser security restrictions - try refreshing the page.';
        } else if (lastError.message.includes('not found') || lastError.message.includes('404')) {
            errorMessage += 'User not found - check if the SID is correct.';
        } else if (lastError.message.includes('network') || lastError.message.includes('fetch')) {
            errorMessage += 'Network connectivity issues - check your internet connection.';
        } else {
            errorMessage += 'Server error - please try again later.';
        }
    }
    
    showError(errorMessage);
}

// Application initialization
function initializeApp() {
    console.log('🚀 Initializing StarMaker Info Fetcher v2.1...');
    
    // Test API connectivity
    testAPIConnectivity().then(result => {
        if (result.success) {
            console.log('✅ API server is reachable:', result.data?.message);
        } else {
            console.warn('⚠️ API server issue:', result.error);
            showError('⚠️ Proxy server connectivity issues detected. Some features may not work properly.');
        }
    });
    
    // Create particles
    try {
        createParticles();
        console.log('✅ Particles initialized');
    } catch (error) {
        console.warn('⚠️ Failed to create particles:', error);
    }
    
    // Set up event listeners
    const fetchBtn = document.getElementById('fetchBtn');
    const sidInput = document.getElementById('sidInput');
    
    if (fetchBtn) {
        fetchBtn.addEventListener('click', handleFetch);
        console.log('✅ Fetch button listener added');
    }
    
    if (sidInput) {
        // Enter key support
        sidInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleFetch();
            }
        });
        
        // Input validation - numbers only
        sidInput.addEventListener('input', function(e) {
            const value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value !== value) {
                e.target.value = value;
            }
        });
        
        // Enhanced placeholder
        if (!sidInput.placeholder) {
            sidInput.placeholder = 'Enter StarMaker SID (e.g., 62122529777)';
        }
        
        console.log('✅ SID input listeners added');
    }
    
    console.log('✅ Application initialization complete');
    console.log('🎯 Primary API:', API_BASE_URL);
    console.log('🔄 Backup API:', BACKUP_API_URL);
    console.log('⏱️ Nonce lifetime:', NONCE_LIFETIME / 1000, 'seconds');
}

// Event listeners
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle already loaded DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global error handlers
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please refresh the page and try again.');
});

window.addEventListener('error', function(event) {
    console.error('❌ Global error:', event.error);
});
