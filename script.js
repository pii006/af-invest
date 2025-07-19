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
                    fetchStockPicks(); // Load stock picks after login
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

// Function to add a new stock pick
async function addStockPick(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('add-stock-pick-message', 'Anda harus login untuk menambahkan rekomendasi.', 'error');
        return;
    }

    const ticker = document.getElementById('ticker')?.value;
    const entryPrice = parseFloat(document.getElementById('entryPrice')?.value);
    const targetPrice = document.getElementById('targetPrice')?.value ? parseFloat(document.getElementById('targetPrice')?.value) : undefined;
    const stopLoss = document.getElementById('stopLoss')?.value ? parseFloat(document.getElementById('stopLoss')?.value) : undefined;
    const analysis = document.getElementById('analysis')?.value;
    const status = document.getElementById('status')?.value;

    if (!ticker || !entryPrice || !analysis || !!status) { // Perbaikan di sini: !status menjadi !!status
        showMessage('add-stock-pick-message', 'Mohon lengkapi semua bidang wajib.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/stockpicks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ticker, entryPrice, targetPrice, stopLoss, analysis, status })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('add-stock-pick-message', data.message, 'success');
            const addStockPickForm = document.getElementById('add-stock-pick-form');
            if (addStockPickForm) addStockPickForm.reset(); // Clear form
            fetchStockPicks(); // Refresh the list
        } else {
            showMessage('add-stock-pick-message', data.message || 'Gagal menambahkan rekomendasi.', 'error');
        }
    } catch (error) {
        console.error('Error adding stock pick:', error);
        showMessage('add-stock-pick-message', 'Terjadi kesalahan jaringan saat menambahkan rekomendasi.', 'error');
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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const contentWrapper = document.getElementById('content-wrapper');
    if (contentWrapper) contentWrapper.classList.add('content-visible');
    
    // Check auth status on load
    const token = localStorage.getItem('token');
    if (token) {
        updateUIForAuth(true);
        fetchStockPicks();
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
    const closeButton = authModal ? authModal.querySelector('.close-button') : null; // Pengecekan null
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authModalTitle = document.getElementById('auth-modal-title');
    const toggleFormLinks = document.querySelectorAll('.toggle-form-link');
    const logoutLink = document.getElementById('logout-link');

    if (authLink) {
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (authModal) authModal.style.display = 'flex';
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (authModalTitle) authModalTitle.textContent = 'Login';
            showMessage('auth-message', '', 'hidden'); // Clear previous messages
        });
    }

    if (closeButton) { // Tambahkan pengecekan null di sini
        closeButton.addEventListener('click', () => {
            if (authModal) authModal.style.display = 'none';
        });
    }

    if (authModal) { // Pastikan modal ada sebelum menambahkan event listener window
        window.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.style.display = 'none';
            }
        });
    }

    toggleFormLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.dataset.form === 'register') {
                if (loginForm) loginForm.classList.add('hidden');
                if (registerForm) registerForm.classList.remove('hidden');
                if (authModalTitle) authModalTitle.textContent = 'Daftar';
            } else { // Jika ingin login
                if (loginForm) loginForm.classList.remove('hidden');
                if (registerForm) registerForm.classList.add('hidden');
                if (authModalTitle) authModalTitle.textContent = 'Login';
            }
            showMessage('auth-message', '', 'hidden'); // Clear messages on form toggle
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('login-phoneNumber')?.value;
            const password = document.getElementById('login-password')?.value;
            await authenticateUser('login', phoneNumber, password);
        });
    }

    if (registerForm) { // Pastikan registerForm ada
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('register-phoneNumber')?.value;
            const password = document.getElementById('register-password')?.value;
            await authenticateUser('register-manual-user', phoneNumber, password);
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            updateUIForAuth(false); // Set UI to logged out state
            showMessage('dashboard-message', 'Anda telah berhasil logout.', 'success');
            const heroSection = document.getElementById('hero');
            if (heroSection) heroSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    const addStockPickForm = document.getElementById('add-stock-pick-form');
    if (addStockPickForm) {
        addStockPickForm.addEventListener('submit', addStockPick);
    }
});
