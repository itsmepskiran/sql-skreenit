/**
 * mobile.js - Global Mobile Navbar & Sidebar Logic
 * Location: /assets/assets/js/mobile.js
 */
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.dashboard-header');
    const sidebar = document.querySelector('.sidebar');
    
    // Safety Switch: Only run on pages with a dashboard layout
    if (!header || !sidebar) return;

    // 1. Create the Hamburger Button if missing
    if (!document.getElementById('mobileMenuToggle')) {
        const menuBtn = document.createElement('button');
        menuBtn.id = 'mobileMenuToggle';
        menuBtn.className = 'btn-menu-mobile';
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Ensure it shows only on mobile
        menuBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
        
        header.insertBefore(menuBtn, header.firstChild);
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
        toggleBtn.insertAdjacentElement('afterend', mobileLogo);
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
    
    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
});