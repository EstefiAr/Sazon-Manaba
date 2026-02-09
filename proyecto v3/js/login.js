/**
 * ========================================
 * LOGIN.JS - AUTENTICACIÓN DE ADMINISTRADOR
 * La Sazón Manaba
 * ========================================
 */

// ===== CREDENCIALES (En producción, usar backend real) =====
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Sistema de login inicializado');
    
    // Verificar si ya hay sesión de admin
    if (isAdminLoggedIn()) {
        window.location.href = 'admin.html';
        return;
    }
    
    // Configurar formulario
    setupLoginForm();
});

// ===== CONFIGURAR FORMULARIO DE LOGIN =====
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Auto-focus en el campo de usuario
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
}

// ===== MANEJAR LOGIN =====
function handleLogin() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    if (!usernameInput || !passwordInput) return;
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    // Validar campos vacíos
    if (!username || !password) {
        showToast('Por favor, completa todos los campos', 'warning');
        return;
    }
    
    // Validar credenciales
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        // Login exitoso
        const adminSession = {
            username: username,
            loginTime: Date.now(),
            token: generateToken()
        };
        
        // Guardar sesión
        localStorage.setItem('admin_session', JSON.stringify(adminSession));
        
        showToast('¡Bienvenido! Redirigiendo...', 'success');
        
        // Redirigir al panel de admin
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
    } else {
        // Login fallido
        showToast('Usuario o contraseña incorrectos', 'error');
        
        // Limpiar contraseña
        passwordInput.value = '';
        passwordInput.focus();
        
        // Agregar efecto de sacudida al formulario
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            loginCard.style.animation = 'shake 0.5s';
            setTimeout(() => {
                loginCard.style.animation = '';
            }, 500);
        }
    }
}

// ===== GENERAR TOKEN SIMPLE =====
function generateToken() {
    return 'TOKEN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// ===== VERIFICAR SI EL ADMIN ESTÁ LOGUEADO =====
function isAdminLoggedIn() {
    try {
        const sessionData = localStorage.getItem('admin_session');
        if (!sessionData) return false;
        
        const session = JSON.parse(sessionData);
        
        // Verificar si el token existe
        if (!session.token) return false;
        
        // Opcional: Verificar tiempo de expiración (12 horas)
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        if (Date.now() - session.loginTime > TWELVE_HOURS) {
            localStorage.removeItem('admin_session');
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// ===== OBTENER SESIÓN DE ADMIN =====
function getAdminSession() {
    try {
        const sessionData = localStorage.getItem('admin_session');
        return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
        return null;
    }
}

// ===== MOSTRAR TOAST =====
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Crear contenedor si no existe
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===== AGREGAR ANIMACIÓN DE SACUDIDA =====
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// ===== EXPORTAR FUNCIONES PARA USO GLOBAL =====
window.isAdminLoggedIn = isAdminLoggedIn;
window.getAdminSession = getAdminSession;

console.log('✅ Sistema de login cargado');
