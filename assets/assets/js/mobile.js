/**
 * mobile.js - Global Mobile Navbar & Sidebar Logic
 * Location: /assets/assets/js/mobile.js
 */

function initMobileMenu() {
    const header = document.querySelector('.dashboard-header');
    const sidebar = document.querySelector('.sidebar');
    
    // Safety Switch: Only run on pages with a dashboard layout
    // Need at least a sidebar OR a header to create mobile menu
    if (!sidebar && !header) {
        // console.log('[Mobile] No sidebar or header found, skipping mobile menu init');
        return false;
    }
    
    // Use main-content as fallback if no header exists
    const headerElement = header || document.querySelector('.main-content') || document.body;

    // 1. Create the Hamburger Button if missing
    if (!document.getElementById('mobileMenuToggle')) {
        const menuBtn = document.createElement('button');
        menuBtn.id = 'mobileMenuToggle';
        menuBtn.className = 'btn-menu-mobile';
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Show on tablet and mobile (1366px and below - covers all iPad models)
        const isMobileOrTablet = window.innerWidth <= 1366;
        menuBtn.style.display = isMobileOrTablet ? 'block' : 'none';
        
        headerElement.insertBefore(menuBtn, headerElement.firstChild);
        // console.log('[Mobile] Created hamburger button, mobile/tablet:', isMobileOrTablet);
    }

    // 2. Create the Mobile Logo for branding
    if (!document.getElementById('mobileHeaderLogo')) {
        // Detect path context
        const isLocal = ['localhost', '127.0.0.1',''].includes(window.location.hostname);
        const assetsBase = isLocal ? '../assets' : 'https://assets.skreenit.com';
        
        const mobileLogo = document.createElement('img');
        mobileLogo.id = 'mobileHeaderLogo';
        mobileLogo.src = `${assetsBase}/assets/images/logobrand.png`;
        mobileLogo.className = 'mobile-header-brand';
        
        const toggleBtn = document.getElementById('mobileMenuToggle');
        if (toggleBtn) {
            toggleBtn.insertAdjacentElement('afterend', mobileLogo);
        }
    }

    // 3. Setup Overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // 4. Toggle Logic
    const toggleBtn = document.getElementById('mobileMenuToggle');
    
    if (toggleBtn) {
        // Remove existing listeners to prevent duplicates
        toggleBtn.replaceWith(toggleBtn.cloneNode(true));
        const freshToggleBtn = document.getElementById('mobileMenuToggle');
        
        // Inside your freshToggleBtn click listener in mobile.js
    freshToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (sidebar) {
            sidebar.classList.toggle('active');
        // REPEAT the visibility check because items might be rendering late
            let checks = 0;
            const interval = setInterval(() => {
                forceNavVisibility();
                checks++;
                if (checks > 10) clearInterval(interval); // Run for 1 second
            }, 100);
        }
        overlay.classList.toggle('active');
    });
    }

    // Function to force sidebar navigation visibility
    function forceNavVisibility() {
        const navMenu = document.querySelector('.sidebar .nav-menu');
        const navItems = document.querySelectorAll('.sidebar .nav-menu li.nav-item');
        const sidebarFooter = document.querySelector('.sidebar .sidebar-footer');
        
        if (navMenu) {
            // Only set basic display properties, avoid aggressive overrides
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.listStyle = 'none';
            navMenu.style.padding = '0';
            navMenu.style.margin = '1rem 0';
            navMenu.style.gap = '0.5rem';
            // Remove any visibility/opacity overrides that might be hiding items
            navMenu.style.visibility = '';
            navMenu.style.opacity = '';
            navMenu.style.height = 'auto';
        }
        
        navItems.forEach(item => {
            // Only set essential properties, avoid aggressive overrides
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '0.875rem 1.5rem';
            item.style.color = 'white';
            item.style.cursor = 'pointer';
            // Remove any visibility/opacity overrides
            item.style.visibility = '';
            item.style.opacity = '';
            item.style.height = 'auto';
            
            // Also force the icon and text to be visible
            const icon = item.querySelector('i');
            const span = item.querySelector('span');
            if (icon) {
                icon.style.display = 'inline-block';
                icon.style.visibility = '';
                icon.style.opacity = '';
            }
            if (span) {
                span.style.display = 'inline';
                span.style.visibility = '';
                span.style.opacity = '';
            }
        });
        
        if (sidebarFooter) {
            sidebarFooter.style.display = 'block';
            sidebarFooter.style.visibility = '';
            sidebarFooter.style.opacity = '';
        }
    }

    // Force visibility immediately and multiple times to ensure it works
    setTimeout(forceNavVisibility, 50);
    setTimeout(forceNavVisibility, 100);
    setTimeout(forceNavVisibility, 300);

    // Remove existing overlay listeners
    overlay.replaceWith(overlay.cloneNode(true));
    const freshOverlay = document.querySelector('.sidebar-overlay');
    
    freshOverlay.addEventListener('click', () => {
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        freshOverlay.classList.remove('active');
    });

    // 5. Handle window resize
    window.addEventListener('resize', () => {
        const menuBtn = document.getElementById('mobileMenuToggle');
        
        if (window.innerWidth <= 1366) {
            if (menuBtn) menuBtn.style.display = 'block';
        } else {
            if (menuBtn) menuBtn.style.display = 'none';
            if (sidebar) sidebar.classList.remove('active');
            if (freshOverlay) freshOverlay.classList.remove('active');
        }
    });
    
    // 6. Close sidebar when clicking outside (on main content)
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const toggleBtn = document.getElementById('mobileMenuToggle');
        
        // Only on mobile and when sidebar is open
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
            // Check if click is outside sidebar and not on toggle button
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnToggle = toggleBtn && toggleBtn.contains(e.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        }
    });

    return true;
}

// Try to init immediately
document.addEventListener('DOMContentLoaded', () => {
    // console.log('[Mobile] DOMContentLoaded, attempting init...');
    const initialized = initMobileMenu();
    
    // If not initialized, retry after a short delay (for dynamically loaded content)
    if (!initialized) {
        setTimeout(() => {
            // console.log('[Mobile] Retrying init after delay...');
            initMobileMenu();
        }, 500);
        
        // Also set up a MutationObserver as fallback
        const observer = new MutationObserver((mutations) => {
            const header = document.querySelector('.dashboard-header');
            const sidebar = document.querySelector('.sidebar');
            if (header || sidebar) {
                // console.log('[Mobile] Header or sidebar detected via observer');
                initMobileMenu();
                observer.disconnect();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Stop observing after 5 seconds
        setTimeout(() => observer.disconnect(), 5000);
    }
});

// Also try init on window load (after all resources loaded)
window.addEventListener('load', () => {
    if (!document.getElementById('mobileMenuToggle')) {
        // console.log('[Mobile] Window load - attempting init...');
        initMobileMenu();
    }
});

// Export for manual initialization if needed
window.initMobileMenu = initMobileMenu;