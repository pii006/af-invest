// script.js

// Base URL for your backend API
const API_BASE_URL = 'https://af-invest-backend-api-anda-81bb04a352e2.herokuapp.com'; // Sesuaikan jika backend Anda di-deploy ke URL lain

// Helper function to show messages
function showMessage(elementId, message, type) {
    const messageBox = document.getElementById(elementId);
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`; // Add type class (success/error)
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000); // Hide after 5 seconds
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
                    document.getElementById('auth-modal').style.display = 'none';
                    updateUIForAuth(true); // Update UI to logged-in state
                    fetchStockPicks(); // Load stock picks after login
                }, 1000);
            } else { // register-manual-user
                showMessage('auth-message', data.message, 'success');
                // Optionally switch to login form after successful registration
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('auth-modal-title').textContent = 'Login';
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

    const ticker = document.getElementById('ticker').value;
    const entryPrice = parseFloat(document.getElementById('entryPrice').value);
    const targetPrice = document.getElementById('targetPrice').value ? parseFloat(document.getElementById('targetPrice').value) : undefined;
    const stopLoss = document.getElementById('stopLoss').value ? parseFloat(document.getElementById('stopLoss').value) : undefined;
    const analysis = document.getElementById('analysis').value;
    const status = document.getElementById('status').value;

    if (!ticker || !entryPrice || !analysis || !status) {
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
            document.getElementById('add-stock-pick-form').reset(); // Clear form
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
    const contentWrapper = document.getElementById('content-wrapper'); // The main content div

    if (isLoggedIn) {
        authLink.classList.add('hidden');
        logoutLink.classList.remove('hidden');
        dashboardSection.classList.remove('hidden');
        contentWrapper.classList.add('logged-in'); // Add class to body for global styling
        contentWrapper.classList.remove('not-logged-in');
        // Scroll to dashboard section or make it prominent
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        authLink.classList.remove('hidden');
        logoutLink.classList.add('hidden');
        dashboardSection.classList.add('hidden');
        contentWrapper.classList.remove('logged-in');
        contentWrapper.classList.add('not-logged-in');
        localStorage.removeItem('token'); // Ensure token is removed on logout
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Loading screen logic
    const loadingScreen = document.getElementById('loading-screen');
    const contentWrapper = document.getElementById('content-wrapper');
    const progressBar = document.getElementById('progress-bar');

    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.visibility = 'hidden';
                loadingScreen.style.display = 'none'; // Ensure it's fully hidden
                contentWrapper.classList.add('content-visible');
                // Check auth status on load
                const token = localStorage.getItem('token');
                if (token) {
                    updateUIForAuth(true);
                    fetchStockPicks();
                } else {
                    updateUIForAuth(false);
                }
            }, 800);
        }
    }, 300);

    // Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navList = document.getElementById('nav-list');
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

    // Service Card Toggle
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
        });
    });

    // Auth Modal Logic
    const authModal = document.getElementById('auth-modal');
    const authLink = document.getElementById('auth-link');
    const closeButton = authModal.querySelector('.close-button');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authModalTitle = document.getElementById('auth-modal-title');
    const toggleFormLinks = document.querySelectorAll('.toggle-form-link');
    const logoutLink = document.getElementById('logout-link');

    authLink.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'flex'; // Use flex to center
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authModalTitle.textContent = 'Login';
        document.getElementById('auth-message').style.display = 'none'; // Clear previous messages
    });

    closeButton.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

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
            document.getElementById('auth-message').style.display = 'none'; // Clear messages on form toggle
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

    // Add Stock Pick Form Submission
    document.getElementById('add-stock-pick-form').addEventListener('submit', addStockPick);
});
const corsOptions = {
  origin: 'https://pii006.github.io/af-invest-frontend/', // Ini HARUS URL GitHub Pages frontend Anda
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
