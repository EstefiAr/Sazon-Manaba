/**
 * ================================================
 * ADMIN.JS - PANEL DE ADMINISTRACIÓN (FUSIONADO)
 * La Sazón Manaba
 * ================================================
 */

// ===== VARIABLES GLOBALES =====
let currentView = 'mesas';
let selectedMesaId = null;
let selectedDishId = null;
let currentOrderId = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando panel de administración...');
    
    // 1. Verificar autenticación (Tu lógica original)
    if (typeof isAdminLoggedIn === 'function' && !isAdminLoggedIn()) {
        console.log('❌ No hay sesión de admin, redirigiendo...');
        window.location.href = 'login.html';
        return;
    }
    
    // 2. Verificar que app esté disponible
    if (typeof app === 'undefined') {
        console.error('❌ App no está definida');
        alert('Error: Sistema no inicializado correctamente.');
        return;
    }
    
    // 3. Mostrar nombre de usuario
    if (typeof getAdminSession === 'function') {
        const session = getAdminSession();
        const adminNameElement = document.getElementById('admin-name');
        if (adminNameElement && session) adminNameElement.textContent = session.username;
    }
    
    // 4. Configurar eventos y reloj
    setupNavigation();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // 5. Cargar vista inicial
    setTimeout(() => {
        loadView('mesas');
    }, 100);
    
    // 6. Polling de pedidos (Actualiza cada 5 segundos para ver pedidos nuevos)
    setInterval(refreshOrders, 5000);
});

// ===== CONFIGURAR NAVEGACIÓN =====
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const view = this.dataset.view;
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            loadView(view);
        });
    });
}

// ===== CARGAR VISTA (Controlador Principal) =====
function loadView(viewName) {
    currentView = viewName;
    
    // UI Update: Ocultar todas las secciones
    document.querySelectorAll('.content-view').forEach(view => view.classList.remove('active'));
    
    // Mostrar sección actual
    const viewElement = document.getElementById(`view-${viewName}`);
    if (viewElement) viewElement.classList.add('active');
    
    // Actualizar Título
    const titleElement = document.getElementById('view-title');
    const titles = { 'mesas': 'Gestión de Mesas', 'pedidos': 'Pedidos Activos', 'menu': 'Gestión de Menú', 'historial': 'Historial de Pedidos' };
    if (titleElement) titleElement.textContent = titles[viewName] || 'Panel';

    // Renderizar datos específicos
    switch (viewName) {
        case 'mesas': renderMesas(); break;
        case 'pedidos': renderPedidos(); break;
        case 'menu': renderMenuManagement(); break;
        case 'historial': renderHistorial(); break;
    }
}

// ===== GESTIÓN DE MESAS (Renderizado Corregido) =====
function renderMesas() {
    const grid = document.querySelector('.mesas-grid');
    if (!grid) return;
    grid.innerHTML = '';

    app.mesas.forEach(mesa => {
        const card = document.createElement('div');
        card.className = `mesa-admin-card ${mesa.status}`;
        card.onclick = () => openMesaModal(mesa.id);
        
        const statusText = { 'available': 'Disponible', 'occupied': 'Ocupada', 'inactive': 'Inactiva' };
        let timeDisplay = (mesa.status === 'occupied' && mesa.sessionStart) ? app.getElapsedTime(mesa.sessionStart) : '-';
        
        card.innerHTML = `
            <div class="mesa-admin-number">${mesa.id}</div>
            <div class="mesa-admin-status">${statusText[mesa.status] || mesa.status}</div>
            <div class="mesa-admin-time">${timeDisplay}</div>
        `;
        grid.appendChild(card);
    });
}

// ===== GESTIÓN DE PEDIDOS (Conexión con Cliente) =====
function renderPedidos() {
    const container = document.getElementById('orders-list');
    const emptyState = document.getElementById('empty-orders');
    if (!container) return;

    const activeOrders = app.getActiveOrders(); // Trae los pedidos de localStorage

    if (activeOrders.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    container.innerHTML = '';

    activeOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = `order-card status-${order.status}`;
        
        const statusLabel = { 'pending': 'Esperando Confirmación', 'confirmed': 'En Cocina', 'ready': 'Listo para Servir' };

        card.innerHTML = `
            <div class="order-header">
                <div>
                    <h4>Mesa ${order.mesaId}</h4>
                    <small>${app.formatTime(order.createdAt)}</small>
                </div>
                <span class="badge-${order.status}">${statusLabel[order.status] || order.status}</span>
            </div>
            <div class="order-body">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.quantity}x ${item.name}</span>
                        ${item.notes ? `<p class="item-notes">📝 ${item.notes}</p>` : ''}
                    </div>
                `).join('')}
            </div>
            <div class="order-footer">
                <strong>Total: ${app.formatCurrency(order.total)}</strong>
                <div class="order-actions">
                    ${order.status === 'pending' ? 
                        `<button class="btn-success" onclick="approveOrderConfirm('${order.id}')">Confirmar Pedido</button>
                         <button class="btn-danger" onclick="rejectOrderConfirm('${order.id}')">Rechazar</button>` : 
                        `<button class="btn-primary" onclick="markOrderReady('${order.id}')">Marcar como Listo</button>`
                    }
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ===== FUNCIONES DE ACCIÓN (Pedidos) =====
function approveOrderConfirm(orderId) {
    if (confirm("¿Confirmar este pedido para cocina?")) {
        app.updateOrderStatus(orderId, 'confirmed');
        app.showToast("Pedido enviado a cocina", "success");
        renderPedidos();
        renderMesas();
    }
}

function rejectOrderConfirm(orderId) {
    if (confirm("¿Seguro que deseas rechazar este pedido?")) {
        app.updateOrderStatus(orderId, 'cancelled');
        app.showToast("Pedido rechazado", "warning");
        renderPedidos();
    }
}

function markOrderReady(orderId) {
    // 1. Actualizar en el motor de la app (esto guarda en LocalStorage)
    app.updateOrderStatus(orderId, 'ready');
    
    // 2. Feedback visual para el admin
    app.showToast("¡Pedido marcado como listo!", "success");
    
    // 3. Refrescar la vista del admin
    renderPedidos();
}

function refreshOrders() {
    if (currentView === 'pedidos') renderPedidos();
}

// ===== GESTIÓN DE MENÚ (Tu lógica original) =====
function renderMenuManagement() {
    renderMenuSection('especialidades-admin', app.menu.especialidades);
    renderMenuSection('menu-dia-admin', app.menu.menuDia);
}

function renderMenuSection(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.map(item => `
        <div class="menu-admin-item ${!item.active ? 'inactive' : ''}">
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>${app.formatCurrency(item.price)}</p>
            </div>
            <div class="item-admin-actions">
                <button onclick="toggleMenuItemStatus('${item.id}')">${item.active ? '🟢' : '🔴'}</button>
                <button onclick="editMenuItem('${item.id}')">✏️</button>
                <button onclick="deleteMenuItem('${item.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ===== UTILIDADES =====
function updateDateTime() {
    const el = document.getElementById('current-datetime');
    if (el) el.textContent = new Date().toLocaleString('es-EC');
}

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('admin_session');
        window.location.href = 'login.html';
    }
}

// ===== MODALES MESA (Tu lógica original mejorada) =====
function openMesaModal(mesaId) {
    selectedMesaId = mesaId;
    const mesa = app.getMesa(mesaId);
    if (!mesa) return;
    
    document.getElementById('modal-mesa-number').textContent = mesaId;
    document.getElementById('modal-mesa-status').textContent = mesa.status;
    document.getElementById('modal-mesa-orders').textContent = mesa.orders.length;
    document.getElementById('mesa-modal').classList.add('active');
    document.getElementById('mesa-modal').style.display = 'flex';
}

function closeMesaModal() {
    document.getElementById('mesa-modal').classList.remove('active');
    document.getElementById('mesa-modal').style.display = 'none';
}

function toggleMesa() {
    const mesa = app.getMesa(selectedMesaId);
    if (mesa.status === 'inactive') {
        app.activateMesa(selectedMesaId);
    }else{
        app.deactivateMesa(selectedMesaId);
    }
    app.saveData(CONFIG.STORAGE_KEYS.MESAS, app.mesas);
    closeMesaModal();
    renderMesas();
    app.showToast(`Mesa ${selectedMesaId} actualizada`, "success");
}

// ===== EXPORTAR A WINDOW PARA EL HTML =====
Object.assign(window, {
    openMesaModal, closeMesaModal, toggleMesa, 
    approveOrderConfirm, rejectOrderConfirm, markOrderReady,
    refreshOrders, logout, toggleMenuItemStatus: (id) => { app.toggleMenuItem(id); renderMenuManagement(); }
});

// ===== SINCRONIZACIÓN AUTOMÁTICA (TIEMPO REAL) =====
window.addEventListener('storage', (event) => {
    // Si cambian las mesas (un cliente se sentó)
    if (event.key === CONFIG.STORAGE_KEYS.MESAS) {
        console.log('🔄 Actualización de mesas detectada...');
        // Forzamos la recarga de datos en la instancia de la app
        app.mesas = app.loadData(CONFIG.STORAGE_KEYS.MESAS);
        
        // Si el admin está en la vista de mesas, redibujamos al instante
        if (currentView === 'mesas') renderMesas();
        app.showToast("Estado de mesas actualizado", "info");
    }

    // Si entra un pedido nuevo
    if (event.key === CONFIG.STORAGE_KEYS.ORDERS) {
        console.log('🔔 Nuevo pedido o cambio de estado detectado...');
        app.orders = app.loadData(CONFIG.STORAGE_KEYS.ORDERS);
        
        // Si el admin está en la vista de pedidos, redibujamos al instante
        if (currentView === 'pedidos') renderPedidos();
        app.showToast("¡Hay novedades en los pedidos!", "info");
    }
});