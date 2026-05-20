// ===========================
// SCRIPT-SIDEBAR-LOGIC.JS
// ===========================

export function initSidebarLogic() {
    window.toggleSidebar = function() {
        if (window.innerWidth <= 768) {
            document.getElementById('appSidebar').classList.toggle('mobile-open');
            let overlay = document.getElementById('mobileOverlay');
            if (overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.style.display = 'none', 300);
                document.body.style.overflow = '';
                document.body.classList.remove('sidebar-mobile-open');
            } else {
                overlay.style.display = 'block';
                setTimeout(() => overlay.classList.add('active'), 10);
                document.body.style.overflow = 'hidden';
                document.body.classList.add('sidebar-mobile-open');
            }
        } else {
            let sidebar = document.getElementById('appSidebar');
            sidebar.classList.remove('keep-open'); // Force remove temporary lock
            sidebar.classList.toggle('collapsed');
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('sidebar_state', 'collapsed');
            } else {
                localStorage.setItem('sidebar_state', 'open');
            }
        }
    };

    window.closeSidebarMobile = function() {
        if (window.innerWidth <= 768) {
            document.getElementById('appSidebar').classList.remove('mobile-open');
            let overlay = document.getElementById('mobileOverlay');
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.style.display = 'none', 300);
            }
            document.body.style.overflow = '';
            document.body.classList.remove('sidebar-mobile-open');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        let sidebar = document.getElementById('appSidebar');
        let activeItem = document.querySelector('.sidebar-item.active');
        
        // Klik menu aktif → muncul garis putih
        if(activeItem && sidebar) {
            activeItem.addEventListener('click', function(e) {
                if (window.innerWidth > 768) {
                    sidebar.classList.add('keep-open');
                    e.stopPropagation();
                }
            });
        }
        
        // Klik di topbar → hilangkan garis putih
        let topbar = document.querySelector('.topbar');
        if(topbar && sidebar) {
            topbar.addEventListener('click', function(e) {
                if (window.innerWidth > 768 && sidebar.classList.contains('keep-open')) {
                    if (!e.target.closest('.hamburger-btn')) {
                        sidebar.classList.remove('keep-open');
                    }
                }
            });
        }
    });
}
