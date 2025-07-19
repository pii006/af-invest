// script.js

// Base URL for your backend API
const API_BASE_URL = 'https://af-invest-backend-api-anda-81bb84a552e2.herokuapp.com/api'; // Pastikan URL ini adalah URL Heroku backend Anda yang sudah di-deploy

// Helper function to show messages
function showMessage(elementId, message, type) {
    const messageBox = document.getElementById(elementId);
    if (messageBox) { // Tambahkan pengecekan null
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`; // Add type class (success/error)
        messageBox.style.display = 'block';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000); // Hide after 5 seconds
    } else {
        console.warn(`Message box with ID '${elementId}' not found.`);
    }
}

// Function to handle authentication (login/register)
async function authenticateUser(endpoint, phoneNumber, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (endpoint === 'login') {
                localStorage.setItem('token', data.token); // Store token in local storage
                showMessage('auth-message', data.message, 'success');
                setTimeout(() => {
                    const authModal = document.getElementById('auth-modal');
                    if (authModal) authModal.style.display = 'none';
                    updateUIForAuth(true); // Update UI to logged-in state
                    // Setelah login, secara default tampilkan Rekomendasi Saham
                    showDashboardContent('stock-picks');
                }, 1000);
            } else { // register-manual-user
                showMessage('auth-message', data.message, 'success');
                // Setelah registrasi sukses, otomatis beralih ke form login
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
                const authModalTitle = document.getElementById('auth-modal-title');
                if (loginForm) loginForm.classList.remove('hidden');
                if (registerForm) registerForm.classList.add('hidden');
                if (authModalTitle) authModalTitle.textContent = 'Login';
            }
        } else {
            showMessage('auth-message', data.message || 'Terjadi kesalahan.', 'error');
        }
    } catch (error) {
        console.error('Error during authentication:', error);
        showMessage('auth-message', 'Terjadi kesalahan jaringan atau server tidak merespons.', 'error');
    }
}

// Function to fetch stock picks
async function fetchStockPicks() {
    const token = localStorage.getItem('token');
    const stockPicksList = document.getElementById('stock-picks-list');
    if (!stockPicksList) {
        console.error('Element with ID "stock-picks-list" not found.');
        return;
    }
    stockPicksList.innerHTML = '<p style="text-align: center; color: var(--light);">Memuat rekomendasi saham...</p>'; // Loading message

    if (!token) {
        stockPicksList.innerHTML = '<p style="text-align: center; color: var(--light);">Silakan login untuk melihat rekomendasi saham.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/stockpicks`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            if (data.length === 0) {
                stockPicksList.innerHTML = '<p style="text-align: center; color: var(--light);">Belum ada rekomendasi saham saat ini.</p>';
            } else {
                stockPicksList.innerHTML = ''; // Clear loading message
                data.forEach(pick => {
                    const pickCard = document.createElement('div');
                    pickCard.className = 'stock-pick-card';
                    pickCard.innerHTML = `
                        <h4>${pick.ticker}</h4>
                        <p><strong>Harga Masuk:</strong> Rp ${pick.entryPrice.toLocaleString('id-ID')}</p>
                        ${pick.targetPrice ? `<p><strong>Harga Target:</strong> Rp ${pick.targetPrice.toLocaleString('id-ID')}</p>` : ''}
                        ${pick.stopLoss ? `<p><strong>Stop Loss:</strong> Rp ${pick.stopLoss.toLocaleString('id-ID')}</p>` : ''}
                        <p><strong>Analisis:</strong> ${pick.analysis}</p>
                        <p><strong>Tanggal Rekomendasi:</strong> ${new Date(pick.recommendationDate).toLocaleDateString('id-ID')}</p>
                        <p><strong>Status:</strong> <span class="status">${pick.status}</span></p>
                    `;
                    stockPicksList.appendChild(pickCard);
                });
            }
        } else {
            showMessage('dashboard-message', data.message || 'Gagal memuat rekomendasi saham.', 'error');
            stockPicksList.innerHTML = '<p style="text-align: center; color: var(--error);">Gagal memuat rekomendasi saham. Silakan coba lagi.</p>';
            if (response.status === 401) { // Unauthorized, token might be invalid/expired
                updateUIForAuth(false); // Log out user
            }
        }
    } catch (error) {
        console.error('Error fetching stock picks:', error);
        showMessage('dashboard-message', 'Terjadi kesalahan jaringan saat memuat rekomendasi.', 'error');
        stockPicksList.innerHTML = '<p style="text-align: center; color: var(--error);">Terjadi kesalahan jaringan saat memuat rekomendasi.</p>';
    }
}

// Function to update UI based on authentication status
function updateUIForAuth(isLoggedIn) {
    const authLink = document.getElementById('auth-link');
    const logoutLink = document.getElementById('logout-link');
    const dashboardSection = document.getElementById('dashboard-section');
    const contentWrapper = document.getElementById('content-wrapper');

    if (isLoggedIn) {
        if (authLink) authLink.classList.add('hidden');
        if (logoutLink) logoutLink.classList.remove('hidden');
        if (dashboardSection) dashboardSection.classList.remove('hidden');
        if (contentWrapper) {
            contentWrapper.classList.add('logged-in');
            contentWrapper.classList.remove('not-logged-in');
        }
        if (dashboardSection) dashboardSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        if (authLink) authLink.classList.remove('hidden');
        if (logoutLink) logoutLink.classList.add('hidden');
        if (dashboardSection) dashboardSection.classList.add('hidden');
        if (contentWrapper) {
            contentWrapper.classList.remove('logged-in');
            contentWrapper.classList.add('not-logged-in');
        }
        localStorage.removeItem('token');
    }
}

// Function to show specific dashboard content
function showDashboardContent(contentType) {
    // Hide all content sections
    document.querySelectorAll('.dashboard-content').forEach(section => {
        section.classList.add('hidden');
    });
    // Remove active class from all nav links
    document.querySelectorAll('.dashboard-nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show the selected content section and set active nav link
    const selectedContent = document.getElementById(`${contentType}-content`);
    const selectedNavLink = document.querySelector(`.dashboard-nav-link[data-content="${contentType}"]`);

    if (selectedContent) selectedContent.classList.remove('hidden');
    if (selectedNavLink) selectedNavLink.classList.add('active');

    // Fetch data for the selected content type
    switch (contentType) {
        case 'stock-picks':
            fetchStockPicks();
            break;
        case 'educational-videos':
            fetchEducationalVideos();
            break;
        case 'educational-pdfs':
            fetchPdfMaterials();
            break;
        case 'spreadsheet-links':
            fetchSpreadsheetLinks();
            break;
        case 'articles':
            fetchArticles();
            break;
        default:
            console.warn('Unknown content type:', contentType);
    }
}

// Placeholder functions for new content types (akan diisi nanti)
async function fetchEducationalVideos() {
    const videosList = document.getElementById('educational-videos-list');
    if (!videosList) return;
    videosList.innerHTML = '<p style="text-align: center; color: var(--light);">Memuat video edukasi...</p>';
    // TODO: Implement actual fetch from backend API for videos
    // For now, mock data:
    setTimeout(() => {
        videosList.innerHTML = `
            <div class="video-card">
                <h4>Pengenalan Pasar Saham</h4>
                <p>Video ini menjelaskan dasar-dasar pasar saham untuk pemula.</p>
                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" class="btn btn-primary">Tonton Video</a>
            </div>
            <div class="video-card">
                <h4>Strategi Investasi Jangka Panjang</h4>
                <p>Pelajari strategi efektif untuk investasi saham jangka panjang.</p>
                <a href="https://www.youtube.com/watch?v=someothervideo" target="_blank" class="btn btn-primary">Tonton Video</a>
            </div>
        `;
    }, 1000);
}

async function fetchPdfMaterials() {
    const pdfsList = document.getElementById('educational-pdfs-list');
    if (!pdfsList) return;
    pdfsList.innerHTML = '<p style="text-align: center; color: var(--light);">Memuat materi PDF...</p>';
    // TODO: Implement actual fetch from backend API for PDFs
    // For now, mock data:
    setTimeout(() => {
        pdfsList.innerHTML = `
            <div class="pdf-item">
                <h4>Panduan Analisis Fundamental</h4>
                <p>Unduh panduan lengkap analisis fundamental saham.</p>
                <a href="https://example.com/panduan_fundamental.pdf" target="_blank" class="btn btn-primary">Unduh PDF</a>
            </div>
            <div class="pdf-item">
                <h4>Glosarium Istilah Saham</h4>
                <p>Daftar lengkap istilah-istilah penting dalam dunia saham.</p>
                <a href="https://example.com/glosarium_saham.pdf" target="_blank" class="btn btn-primary">Unduh PDF</a>
            </div>
        `;
    }, 1000);
}

async function fetchSpreadsheetLinks() {
    const spreadsheetsList = document.getElementById('spreadsheet-links-list');
    if (!spreadsheetsList) return;
    spreadsheetsList.innerHTML = '<p style="text-align: center; color: var(--light);">Memuat link spreadsheet...</p>';
    // TODO: Implement actual fetch from backend API for spreadsheets
    // For now, mock data:
    setTimeout(() => {
        spreadsheetsList.innerHTML = `
            <div class="spreadsheet-item">
                <h4>Rekomendasi Swing Trade (Januari 2025)</h4>
                <p>Spreadsheet ini berisi rekomendasi saham untuk swing trade di bulan Januari.</p>
                <a href="https://docs.google.com/spreadsheets/d/someid1" target="_blank" class="btn btn-primary">Buka Spreadsheet</a>
            </div>
            <div class="spreadsheet-item">
                <h4>Daftar Saham Dividen</h4>
                <p>Daftar saham dengan riwayat dividen yang menarik.</p>
                <a href="https://docs.google.com/spreadsheets/d/someid2" target="_blank" class="btn btn-primary">Buka Spreadsheet</a>
            </div>
        `;
    }, 1000);
}

async function fetchArticles() {
    const articlesList = document.getElementById('articles-list');
    if (!articlesList) return;
    articlesList.innerHTML = '<p style="text-align: center; color: var(--light);">Memuat artikel edukasi...</p>';
    // TODO: Implement actual fetch from backend API for articles
    // For now, mock data:
    setTimeout(() => {
        articlesList.innerHTML = `
            <div class="article-item">
                <h4>Memahami Laporan Keuangan Perusahaan</h4>
                <p>Artikel mendalam tentang cara membaca dan menganalisis laporan keuangan.</p>
                <a href="#" class="btn btn-primary">Baca Artikel</a>
            </div>
            <div class="article-item">
                <h4>Psikologi Trading: Mengendalikan Emosi di Pasar</h4>
                <p>Tips dan trik untuk mengelola emosi saat melakukan trading saham.</p>
                <a href="#" class="btn btn-primary">Baca Artikel</a>
            </div>
        `;
    }, 1000);
}


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Content wrapper should be visible by default as loading screen is removed
    const contentWrapper = document.getElementById('content-wrapper');
    if (contentWrapper) contentWrapper.classList.add('content-visible');
    
    // Check auth status on load
    const token = localStorage.getItem('token');
    if (token) {
        updateUIForAuth(true);
        // Default to showing stock picks on login/load
        showDashboardContent('stock-picks');
    } else {
        updateUIForAuth(false);
    }

    // Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.getElementById('nav-list');
    if (menuToggle && navList) {
        menuToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close mobile menu on nav link click
        navList.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (navList.classList.contains('active')) {
                    navList.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            });
        });
    }

    // Service Card Toggle
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
        });
    });

    // Auth Modal Logic
    const authModal = document.getElementById('auth-modal');
    const authLink = document.getElementById('auth-link');
    const closeButton = authModal ? authModal.querySelector('.close-button') : null; // Cek keberadaan closeButton
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authModalTitle = document.getElementById('auth-modal-title');
    const toggleFormLinks = document.querySelectorAll('.toggle-form-link');
    const logoutLink = document.getElementById('logout-link');

    if (authLink) { // Pastikan authLink ada
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.style.display = 'flex'; // Use flex to center
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            authModalTitle.textContent = 'Login';
            document.getElementById('auth-message').style.display = 'none'; // Clear previous messages
        });
    }

    if (closeButton) { // Pastikan closeButton ada sebelum menambahkan event listener
        closeButton.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    toggleFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.dataset.form === 'register') {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                authModalTitle.textContent = 'Daftar';
            } else {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                authModalTitle.textContent = 'Login';
            }
            showMessage('auth-message', '', 'hidden'); // Clear messages on form toggle
        });
    });

    // Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('login-phoneNumber').value;
        const password = document.getElementById('login-password').value;
        await authenticateUser('login', phoneNumber, password);
    });

    // Register Form Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneNumber = document.getElementById('register-phoneNumber').value;
        const password = document.getElementById('register-password').value;
        await authenticateUser('register-manual-user', phoneNumber, password);
    });

    // Logout Link
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        updateUIForAuth(false); // Set UI to logged out state
        showMessage('dashboard-message', 'Anda telah berhasil logout.', 'success');
        // Optionally scroll to top or hero section
        document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
    });

    // Dashboard Navigation Event Listeners
    document.querySelectorAll('.dashboard-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const contentType = e.target.dataset.content;
            showDashboardContent(contentType);
        });
    });
});
