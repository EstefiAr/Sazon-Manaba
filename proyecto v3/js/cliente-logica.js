/**
 * ================================================
 * CLIENTE-LOGICA.JS - LÓGICA DEL LADO DEL CLIENTE
 * La Sazón Manaba
 * ================================================
 */

// ===== INICIALIZACIÓN AL CARGAR LA PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🍽️ Iniciando interfaz del cliente...');
    
    // Verificar si hay parámetro de mesa en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const mesaParam = urlParams.get('mesa');
    
    if (mesaParam) {
        // Si viene de un QR, intentar acceder directamente
        handleMesaAccess(mesaParam);
    } else {
        // Verificar si hay sesión activa
        const session = app.getSession();
        if (session && !app.isSessionExpired()) {
            // Restaurar sesión
            showMenuView(session.mesaId);
            startSessionTimer();
        } else {
            // Mostrar selección de mesas
            showMesaSelection();
        }
    }
});

// ===== VOLVER A SELECCIÓN DE MESAS =====
function returnToMesaSelection() {
    const session = app.getSession();
    
    // Verificar si hay items en el carrito
    if (!cart.isEmpty()) {
        const confirmMsg = '⚠️ Tienes items en el carrito.\n\n¿Estás seguro de que quieres cambiar de mesa?\n\nSe perderán los items del carrito.';
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    // Verificar si hay pedidos activos
    if (session) {
        const mesaOrders = app.getMesaOrders(session.mesaId);
        const activeOrders = mesaOrders.filter(o => 
            ['pending', 'confirmed', 'preparing'].includes(o.status)
        );
        
        if (activeOrders.length > 0) {
            const confirmMsg = `⚠️ Tienes ${activeOrders.length} pedido(s) activo(s).\n\n¿Deseas cambiar de mesa de todas formas?\n\nTus pedidos seguirán en la Mesa ${session.mesaId}.`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }
        
        // Liberar la mesa actual
        app.freeMesa(session.mesaId);
        
        // Limpiar sesión
        app.clearSession();
        
        // Limpiar carrito
        cart.clear();
        
        // Detener timers
        if (sessionTimer) {
            clearInterval(sessionTimer);
        }
        
        if (typeof statusCheckInterval !== 'undefined' && statusCheckInterval) {
            clearInterval(statusCheckInterval);
        }
        
        if (typeof globalOrderCheckInterval !== 'undefined' && globalOrderCheckInterval) {
            clearInterval(globalOrderCheckInterval);
        }
    }
    
    // Mostrar selección de mesas
    showMesaSelection();
    
    // Actualizar URL
    window.history.pushState({}, '', window.location.pathname);
    
    app.showToast('Selecciona una nueva mesa', 'info');
}

// ===== MOSTRAR SELECCIÓN DE MESAS =====
function showMesaSelection() {
    const mesaSection = document.getElementById('mesa-selection');
    const menuView = document.getElementById('menu-view');
    
    if (mesaSection) mesaSection.style.display = 'block';
    if (menuView) menuView.style.display = 'none';
    
    renderMesas();
}

// ===== RENDERIZAR MESAS DISPONIBLES =====
function renderMesas() {
    const mesaGrid = document.querySelector('.mesa-grid');
    if (!mesaGrid) return;
    
    app.mesas = app.loadData(CONFIG.STORAGE_KEYS.MESAS) || app.initializeMesas();
    mesaGrid.innerHTML = '';
    
    app.mesas.forEach(mesa => {
        const mesaCard = document.createElement('div');
        mesaCard.className = `mesa-card ${mesa.status}`;
        
        const statusText = {
            'available': 'Disponible',
            'occupied': 'Ocupada',
            'inactive': 'No Disponible'
        };
        
        mesaCard.innerHTML = `
            <span class="mesa-number">${mesa.id}</span>
            <span class="mesa-status">${statusText[mesa.status]}</span>
        `;
        if (mesa.status === 'available') {
            mesaCard.onclick = () => handleMesaAccess(mesa.id);
        } else {
            // Si está inactiva u ocupada, desactivamos visualmente el puntero
            mesaCard.style.cursor = 'not-allowed';
            mesaCard.title = mesa.status === 'inactive' ? 'Mesa fuera de servicio' : 'Mesa en uso';
        }
        
        mesaGrid.appendChild(mesaCard);
    });
}

// ===== MANEJAR ACCESO A MESA =====
function handleMesaAccess(mesaId) {
    const mesa = app.getMesa(mesaId);
    
    if (!mesa) {
        app.showToast('Mesa no encontrada', 'error');
        return;
    }
    
    // Verificar estado de la mesa
    if (mesa.status === 'inactive') {
        app.showToast('Esta mesa no está disponible', 'warning');
        return;
    }
    
    if (mesa.status === 'occupied') {
        app.showToast('Esta mesa está ocupada. Por favor, selecciona otra.', 'warning');
        return;
    }
    
    // Mesa disponible - ocuparla
    const session = app.createSession(mesaId);
    app.occupyMesa(mesaId, session.id);
    
    // Mostrar vista del menú
    showMenuView(mesaId);
    startSessionTimer();
    
    app.showToast(`Bienvenido a la Mesa ${mesaId}`, 'success');
}

// ===== MOSTRAR VISTA DEL MENÚ =====
function showMenuView(mesaId) {
    const mesaSection = document.getElementById('mesa-selection');
    const menuView = document.getElementById('menu-view');
    const currentMesa = document.getElementById('current-mesa');
    
    if (mesaSection) mesaSection.style.display = 'none';
    if (menuView) menuView.style.display = 'block';
    if (currentMesa) currentMesa.textContent = mesaId;
    
    // Actualizar URL sin recargar
    const newUrl = `${window.location.pathname}?mesa=${mesaId}`;
    window.history.pushState({ mesaId }, '', newUrl);
    
    // Renderizar menú
    renderMenu();
    
    // Configurar tabs
    setupTabs();
    
    // Actualizar display del carrito
    cart.updateDisplay();
    
    // Iniciar verificación global de pedidos listos
    if (typeof startGlobalOrderCheck !== 'undefined') {
        startGlobalOrderCheck();
    }
}

// ===== CONFIGURAR TABS DEL MENÚ =====
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remover clase active de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Activar tab seleccionado
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// ===== RENDERIZAR MENÚ =====
function renderMenu() {
    renderEspecialidades();
    renderMenuDia();
}

// ===== RENDERIZAR ESPECIALIDADES =====
function renderEspecialidades() {
    const container = document.getElementById('especialidades-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const especialidades = app.getActiveEspecialidades();
    
    if (especialidades.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-600); padding: 2rem;">No hay especialidades disponibles</p>';
        return;
    }
    
    especialidades.forEach(item => {
        const menuItem = createMenuItem(item);
        container.appendChild(menuItem);
    });
}

// ===== RENDERIZAR MENÚ DEL DÍA =====
function renderMenuDia() {
    const container = document.getElementById('menu-dia-list');
    const dateElement = document.getElementById('menu-dia-date');
    
    if (!container) return;
    
    // Mostrar fecha actual
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('es-EC', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    container.innerHTML = '';
    
    const menuDia = app.getActiveMenuDia();
    
    if (menuDia.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-600); padding: 2rem;">No hay menú del día disponible</p>';
        return;
    }
    
    menuDia.forEach(item => {
        const menuItem = createMenuItem(item);
        container.appendChild(menuItem);
    });
}

// ===== CREAR ELEMENTO DE ITEM DEL MENÚ =====
function createMenuItem(item) {
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.dataset.itemId = item.id;
    
    const notesId = `notes-${item.id}`;
    const qtyId = `qty-${item.id}`;
    
    div.innerHTML = `
        <div class="item-header">
            <span class="item-name">${item.name}</span>
            <span class="item-price">${app.formatCurrency(item.price)}</span>
        </div>

          ${item.image ? `
        <img src="${item.image}" 
             alt="${item.name}" 
             class="item-image"
             onerror="this.style.display='none'">
    ` : ''}
        
        ${item.description ? `
            <p class="item-description">${item.description}</p>
        ` : ''}
        
        ${item.customizable ? `
            <textarea 
                class="notes-input" 
                id="${notesId}" 
                placeholder="Personalizaciones (ej: sin cebolla, sin picante)"></textarea>
        ` : ''}
        
        <div class="item-actions">
            <div class="quantity-selector">
                <button class="qty-btn" onclick="decrementQty('${qtyId}')">-</button>
                <span class="qty-display" id="${qtyId}">1</span>
                <button class="qty-btn" onclick="incrementQty('${qtyId}')">+</button>
            </div>
            <button class="btn-add-cart" onclick="addToCart('${item.id}', '${qtyId}', '${notesId}')">
                Agregar 🛒
            </button>
        </div>
    `;
    
    return div;
}

// ===== INCREMENTAR CANTIDAD =====
function incrementQty(qtyId) {
    const qtyElement = document.getElementById(qtyId);
    if (qtyElement) {
        let currentQty = parseInt(qtyElement.textContent);
        if (currentQty < 99) { // Límite máximo
            qtyElement.textContent = currentQty + 1;
        }
    }
}

// ===== DECREMENTAR CANTIDAD =====
function decrementQty(qtyId) {
    const qtyElement = document.getElementById(qtyId);
    if (qtyElement) {
        let currentQty = parseInt(qtyElement.textContent);
        if (currentQty > 1) { // Mínimo 1
            qtyElement.textContent = currentQty - 1;
        }
    }
}

// ===== AGREGAR AL CARRITO =====
function addToCart(itemId, qtyId, notesId) {
    const menuItem = app.getMenuItem(itemId);
    if (!menuItem) {
        app.showToast('Error: Plato no encontrado', 'error');
        return;
    }
    
    const qtyElement = document.getElementById(qtyId);
    const notesElement = document.getElementById(notesId);
    
    const quantity = qtyElement ? parseInt(qtyElement.textContent) : 1;
    const notes = notesElement ? notesElement.value.trim() : '';
    
    // Agregar al carrito
    cart.addItem(menuItem, quantity, notes);
    
    // Reset cantidad a 1
    if (qtyElement) {
        qtyElement.textContent = '1';
    }
    
    // Limpiar notas
    if (notesElement) {
        notesElement.value = '';
    }
    
    // Actualizar actividad de la mesa
    const session = app.getSession();
    if (session) {
        app.updateMesaActivity(session.mesaId);
        app.updateSessionActivity();
    }
}

// ===== TEMPORIZADOR DE SESIÓN =====
let sessionTimer;
let sessionSeconds = 0;

function startSessionTimer() {
    // Limpiar temporizador anterior si existe
    if (sessionTimer) {
        clearInterval(sessionTimer);
    }
    
    sessionSeconds = 0;
    
    sessionTimer = setInterval(() => {
        sessionSeconds++;
        updateSessionDisplay();
        
        // Verificar si la sesión expiró
        if (app.isSessionExpired()) {
            handleSessionExpired();
        }
        
        // Advertencia a los 9 minutos
        if (sessionSeconds === 540) { // 9 minutos
            app.showToast('Tu sesión expirará pronto. Por favor, realiza un pedido.', 'warning');
        }
    }, 1000);
}

function updateSessionDisplay() {
    const timerElement = document.getElementById('session-timer');
    if (timerElement) {
        const minutes = Math.floor(sessionSeconds / 60);
        const seconds = sessionSeconds % 60;
        timerElement.textContent = `Tiempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function handleSessionExpired() {
    clearInterval(sessionTimer);
    
    const session = app.getSession();
    if (session) {
        // Liberar la mesa
        app.freeMesa(session.mesaId);
        
        // Limpiar sesión
        app.clearSession();
        
        // Limpiar carrito
        cart.clear();
    }
    
    alert('Tu sesión ha expirado por inactividad. Por favor, selecciona una mesa nuevamente.');
    window.location.href = 'index.html';
}

// ===== VERIFICAR INACTIVIDAD PERIÓDICAMENTE =====
setInterval(() => {
    const session = app.getSession();
    if (session) {
        const mesa = app.getMesa(session.mesaId);
        if (mesa) {
            app.checkMesaInactivity(session.mesaId);
        }
    }
}, 30000); // Verificar cada 30 segundos

// ===== MANEJAR EVENTOS DE ACTIVIDAD =====
['click', 'scroll', 'keypress', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, () => {
        const session = app.getSession();
        if (session) {
            app.updateSessionActivity();
            app.updateMesaActivity(session.mesaId);
        }
    }, { passive: true });
});

// ===== PREVENIR SALIDA ACCIDENTAL =====
window.addEventListener('beforeunload', function(e) {
    const session = app.getSession();
    if (session && !cart.isEmpty()) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro de que quieres salir? Tienes items en tu carrito.';
        return e.returnValue;
    }
});

console.log('✅ Lógica del cliente inicializada');

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.returnToMesaSelection = returnToMesaSelection;

// Escuchar cambios del administrador en tiempo real
window.addEventListener('storage', (event) => {
    if (event.key === CONFIG.STORAGE_KEYS.MESAS) {
        // ... (tu código actual de mesas)
    }

    // NUEVO: Detectar cuando el admin cambia el estado de un pedido (ej: a "Listo")
    if (event.key === CONFIG.STORAGE_KEYS.ORDERS) {
        console.log('🔔 Actualización de pedido recibida');
        app.orders = app.loadData(CONFIG.STORAGE_KEYS.ORDERS);
        
        const session = app.getSession();
        if (session) {
            const misPedidos = app.getMesaOrders(session.mesaId);
            const pedidoListo = misPedidos.find(o => o.status === 'ready');
            
            if (pedidoListo) {
                app.showToast(`¡Tu pedido de la Mesa ${session.mesaId} está listo! ☕`, 'success');
                // Si tienes una función para refrescar el historial del cliente, llámala aquí
                if (typeof renderMisPedidos === 'function') renderMisPedidos();
            }
        }
    }
});

window.addEventListener('focus', () => {
    console.log('👀 Pestaña activa, sincronizando datos...');
    app.mesas = app.loadData(CONFIG.STORAGE_KEYS.MESAS);
    const mesaSection = document.getElementById('mesa-selection');
    if (mesaSection && mesaSection.style.display !== 'none') {
        renderMesas();
    }
});