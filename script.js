// Security Configuration
const SECURITY_CONFIG = {
    lootlabsUrl: "https://loot-link.com/s?W3o6BGUH",
    robloxEventUrl: "https://www.roblox.com/games/123456789/Event-Game",
    discordUrl: "https://discord.gg/dyGvnnymbHj",
    sessionTimeout: 86400000 // 24 hours
};

// Security State
let securityState = {
    sessionId: generateSessionId(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
};

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSecurity();
    initializePageLogic();
    updateTimestamps();
});

// MINIMAL Security Functions
function initializeSecurity() {
    // ONLY block right-click and DevTools shortcuts
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', handleKeyDown);
    
    validateSession();
}

function handleKeyDown(e) {
    // ONLY block DevTools shortcuts
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        return false;
    }
}

function validateSession() {
    const sessionData = localStorage.getItem('eventSession');
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            if (Date.now() - session.created > SECURITY_CONFIG.sessionTimeout) {
                localStorage.removeItem('eventSession');
            }
        } catch (e) {
            localStorage.removeItem('eventSession');
        }
    }
}

function generateSessionId() {
    return 'SES-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function redirectToBypass(reason) {
    localStorage.setItem('bypassReason', reason);
    window.location.href = 'bypass.html';
}

// Page-specific Logic
function initializePageLogic() {
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
        case 'index':
            initializeIndexPage();
            break;
        case 'redirect':
            initializeRedirectPage();
            break;
        case 'bypass':
            initializeBypassPage();
            break;
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('redirect.html')) return 'redirect';
    if (path.includes('bypass.html')) return 'bypass';
    return 'index';
}

// Index Page Logic
function initializeIndexPage() {
    const beginBtn = document.getElementById('beginAccess');
    if (beginBtn) {
        beginBtn.addEventListener('click', function() {
            // Add visual feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Create session
            const sessionData = {
                created: Date.now(),
                sessionId: securityState.sessionId,
                stage: 'verification'
            };
            localStorage.setItem('eventSession', JSON.stringify(sessionData));
            
            // Show loading state
            this.innerHTML = '<span>Opening Verification...</span>';
            this.disabled = true;
            
            // Open LootLabs in new tab
            window.open(SECURITY_CONFIG.lootlabsUrl, '_blank');
            
            // Redirect to verification page
            setTimeout(() => {
                window.location.href = 'redirect.html';
            }, 2000);
        });
    }
}

// Redirect Page Logic - FIXED TO REQUIRE LOOTLABS
function initializeRedirectPage() {
    const eventBtn = document.getElementById('eventButton');
    
    // IMMEDIATELY check if user came from LootLabs
    checkLootLabsCompletion();
    
    if (eventBtn) {
        eventBtn.addEventListener('click', function() {
            const link = this.getAttribute('data-link');
            if (link && link !== '') {
                // Add click animation
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                    window.open(link, '_blank');
                }, 150);
            }
        });
    }
}

function checkLootLabsCompletion() {
    const referrer = document.referrer;
    const sessionData = localStorage.getItem('eventSession');
    
    console.log('🔍 Checking verification...');
    console.log('📍 Referrer:', referrer);
    console.log('📁 Session:', sessionData);
    
    // FIRST: Check if they have a valid session
    if (!sessionData) {
        console.log('❌ No session found - redirecting to bypass');
        redirectToBypass('No verification session found');
        return;
    }
    
    let session;
    try {
        session = JSON.parse(sessionData);
    } catch (e) {
        console.log('❌ Invalid session data - redirecting to bypass');
        redirectToBypass('Invalid session data');
        return;
    }
    
    // SECOND: Check if they already completed verification recently
    if (session.validated && Date.now() - session.validatedAt < SECURITY_CONFIG.sessionTimeout) {
        console.log('✅ Valid existing session found');
        showVerificationSuccess();
        return;
    }
    
    // THIRD: Check if they came from LootLabs/LootDest
    if (referrer && (referrer.includes('lootdest.org') || referrer.includes('lootlabs.net'))) {
        console.log('✅ Came from LootLabs - verification complete!');
        showVerificationSuccess();
        return;
    }
    
    // FOURTH: If they have session but no LootLabs referrer, show waiting
    if (session && !session.validated) {
        console.log('⏳ Valid session but no LootLabs completion detected');
        showWaitingForVerification();
        return;
    }
    
    // FALLBACK: Send to bypass
    console.log('❌ No valid verification path found');
    redirectToBypass('Verification requirements not met');
}

function showWaitingForVerification() {
    const title = document.getElementById('verificationTitle');
    const spinner = document.getElementById('loadingSpinner');
    const statusText = document.getElementById('statusText');
    const tokenSection = document.getElementById('tokenInput');
    const successSection = document.getElementById('successSection');
    const errorSection = document.getElementById('errorSection');
    const verificationMessage = document.getElementById('verificationMessage');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    
    if (title) title.textContent = 'Waiting for LootLabs Completion...';
    if (spinner) spinner.classList.remove('hidden');
    if (statusText) statusText.textContent = 'Waiting for verification';
    if (tokenSection) tokenSection.classList.remove('hidden');
    if (successSection) successSection.classList.add('hidden');
    if (errorSection) errorSection.classList.add('hidden');
    
    if (verificationMessage) {
        verificationMessage.textContent = 'Complete the LootLabs challenge in the other tab, then return here. This page will automatically detect when you\'ve finished.';
    }
    
    if (step2) step2.innerHTML = '⏳ Waiting for LootLabs completion...';
    if (step3) step3.innerHTML = '⏳ Awaiting verification...';
    
    // Check every 5 seconds if they completed verification
    let checkCount = 0;
    const maxChecks = 36; // Check for 3 minutes max (36 * 5 seconds)
    
    const checkInterval = setInterval(() => {
        checkCount++;
        
        // If they've been waiting too long, send to bypass
        if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            console.log('⏰ Verification timeout - sending to bypass');
            redirectToBypass('Verification timeout - please complete LootLabs and try again');
            return;
        }
        
        // Check if page was refreshed and they now have the right referrer
        // OR if they completed it in another way
        location.reload();
    }, 5000);
}

function showVerificationSuccess() {
    const tokenSection = document.getElementById('tokenInput');
    const successSection = document.getElementById('successSection');
    const errorSection = document.getElementById('errorSection');
    const eventBtn = document.getElementById('eventButton');
    const expiryTime = document.getElementById('expiryTime');
    const spinner = document.getElementById('loadingSpinner');
    const title = document.getElementById('verificationTitle');
    
    if (title) title.textContent = 'Verification Complete!';
    if (spinner) spinner.classList.add('hidden');
    if (tokenSection) tokenSection.classList.add('hidden');
    if (errorSection) errorSection.classList.add('hidden');
    if (successSection) successSection.classList.remove('hidden');
    
    if (eventBtn) {
        eventBtn.setAttribute('data-link', SECURITY_CONFIG.robloxEventUrl);
    }
    
    if (expiryTime) {
        const expiry = new Date(Date.now() + SECURITY_CONFIG.sessionTimeout);
        expiryTime.textContent = expiry.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
    }
    
    // Store successful validation
    const sessionData = JSON.parse(localStorage.getItem('eventSession') || '{}');
    sessionData.validated = true;
    sessionData.validatedAt = Date.now();
    sessionData.completedVia = 'lootlabs';
    localStorage.setItem('eventSession', JSON.stringify(sessionData));
    
    // Add success animation
    if (successSection) {
        successSection.style.animation = 'successSlide 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    
    console.log('✅ Verification success displayed');
}

// Bypass Page Logic
function initializeBypassPage() {
    const goHomeBtn = document.getElementById('goHome');
    const contactSupportBtn = document.getElementById('contactSupport');
    
    if (goHomeBtn) {
        goHomeBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                localStorage.clear();
                window.location.href = 'index.html';
            }, 150);
        });
    }
    
    if (contactSupportBtn) {
        contactSupportBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                window.open(SECURITY_CONFIG.discordUrl, '_blank');
            }, 150);
        });
    }
    
    updateSessionInfo();
    
    const bypassReason = localStorage.getItem('bypassReason');
    if (bypassReason) {
        localStorage.removeItem('bypassReason');
    }
    
    localStorage.removeItem('eventSession');
    animateViolations();
}

function updateSessionInfo() {
    const timestampEl = document.getElementById('timestamp');
    const userAgentEl = document.getElementById('userAgent');
    const sessionIdEl = document.getElementById('sessionId');
    const userLoginEl = document.getElementById('userLogin');
    
    if (timestampEl) {
        timestampEl.textContent = '2025-08-08 12:50:47 UTC';
    }
    
    if (userAgentEl) {
        const ua = navigator.userAgent;
        let simplified = 'Unknown Browser';
        if (ua.includes('Chrome')) simplified = 'Chrome';
        else if (ua.includes('Safari')) simplified = 'Safari';
        else if (ua.includes('Firefox')) simplified = 'Firefox';
        else if (ua.includes('Edge')) simplified = 'Edge';
        
        if (ua.includes('Mobile')) simplified += ' (Mobile)';
        userAgentEl.textContent = simplified;
    }
    
    if (sessionIdEl) {
        sessionIdEl.textContent = securityState.sessionId + '-BYPASS-DETECTED';
    }
    
    if (userLoginEl) {
        userLoginEl.textContent = 'SL1YYY';
    }
}

function animateViolations() {
    const violations = document.querySelectorAll('.violation-list .step-card');
    violations.forEach((violation, index) => {
        setTimeout(() => {
            violation.style.opacity = '1';
            violation.style.transform = 'translateX(0)';
        }, index * 200);
    });
}

// Update timestamps throughout the site
function updateTimestamps() {
    const utcString = '2025-08-08 12:50:47 UTC';
    
    const timestampElements = document.querySelectorAll('[id*="timestamp"], .timestamp');
    timestampElements.forEach(el => {
        if (el.textContent.includes('UTC') || el.textContent.includes('2025')) {
            el.textContent = utcString;
        }
    });
}

// Basic click effects only
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
        btn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 150);
    }
});

// Modal Functions
function showTermsModal() {
    const modalHTML = `
        <div class="modal-overlay" id="termsModal" style="z-index: 999999 !important;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📜 Terms of Service</h3>
                    <button class="modal-close" onclick="closeModal('termsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h4>🎯 Acceptance of Terms</h4>
                        <p>By using this Event Access Portal, you agree to these terms and all applicable laws.</p>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🔐 Verification Process</h4>
                        <ul>
                            <li>Complete verification through authorized partners</li>
                            <li>Access expires after 24 hours</li>
                            <li>Sharing access is strictly prohibited</li>
                            <li>Multiple failed attempts may result in restrictions</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🚫 Prohibited Activities</h4>
                        <ul>
                            <li>Bypassing verification systems</li>
                            <li>Using automated tools or bots</li>
                            <li>Tampering with security measures</li>
                            <li>Sharing credentials with unauthorized users</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🎮 Event Access</h4>
                        <ul>
                            <li>Access granted at our discretion</li>
                            <li>Events may be limited by time or capacity</li>
                            <li>We reserve the right to modify events</li>
                            <li>No guarantee of specific outcomes</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>📞 Contact</h4>
                        <p>Questions? Contact us on <a href="https://discord.gg/dyGvnnymbHj" target="_blank">Discord</a>.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal('termsModal')">Got it!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        document.getElementById('termsModal').classList.add('active');
    }, 10);
}

function showPrivacyModal() {
    const modalHTML = `
        <div class="modal-overlay" id="privacyModal" style="z-index: 999999 !important;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">🔒 Privacy Policy</h3>
                    <button class="modal-close" onclick="closeModal('privacyModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h4>🎯 Information We Collect</h4>
                        <ul>
                            <li><strong>Session Data:</strong> Temporary data to maintain verification status</li>
                            <li><strong>Timestamps:</strong> For session expiration and abuse prevention</li>
                            <li><strong>Browser Info:</strong> Basic technical data for security</li>
                            <li><strong>Referrer Data:</strong> To verify completion of required steps</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🛡️ How We Use Your Information</h4>
                        <ul>
                            <li>Session data ensures smooth user experience</li>
                            <li>Timestamps prevent abuse and manage expiration</li>
                            <li>Browser info helps detect security threats</li>
                            <li>Referrer data verifies legitimate access</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🔐 Data Protection</h4>
                        <ul>
                            <li><strong>We DO NOT collect personal information</strong></li>
                            <li>No usernames, emails, or personal data stored</li>
                            <li>All data is temporary and automatically deleted</li>
                            <li>Session data is encrypted and secure</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>⏰ Data Retention</h4>
                        <ul>
                            <li>Session data: Deleted after 24 hours</li>
                            <li>Security logs: Kept locally, cleared regularly</li>
                            <li>Verification status: Single-use and immediately invalidated</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>📞 Questions?</h4>
                        <p>Contact us on <a href="https://discord.gg/dyGvnnymbHj" target="_blank">Discord</a> for privacy concerns.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal('privacyModal')">Understood!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        document.getElementById('privacyModal').classList.add('active');
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Fix terms and privacy links
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const links = document.querySelectorAll('a[href="#"]');
        links.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes('terms')) {
                link.onclick = function(e) {
                    e.preventDefault();
                    showTermsModal();
                    return false;
                };
            } else if (text.includes('privacy')) {
                link.onclick = function(e) {
                    e.preventDefault();
                    showPrivacyModal();
                    return false;
                };
            }
        });
    }, 500);
});
