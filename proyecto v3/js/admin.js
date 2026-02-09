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

    setInterval(() => {
        const modal = document.getElementById('mesa-modal');
        if(modal && modal.style.display === 'flex' && selectedMesaId) {
            const mesa = app.getMesa(selectedMesaId);
            const tiempoElement = document.getElementById('modal-mesa-time');

            if(mesa && mesa.status === 'occupied' && mesa.sessionStart && tiempoElement) {
                tiempoElement.textContent = app.getElapsedTime(mesa.sessionStart);
            }
        }}, 1000);
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
                        `<button class="btn-approve-order" onclick="approveOrderConfirm('${order.id}')">Confirmar Pedido</button>
                         <button class="btn-reject-order" onclick="rejectOrderConfirm('${order.id}')">Rechazar</button>` : 
                        `<button class="btn-ready-order" onclick="markOrderReady('${order.id}')">Marcar como Listo</button>`
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
    document.getElementById('modal-mesa-status').textContent = mesa.status === 'occupied' ? 'Ocupada' : (mesa.status === 'available' ? 'Disponible' : 'Inactiva');
    const pedidoMesa = app.getMesaOrders(mesaId).filter(o =>o.status !== 'canceled' && o.status !== 'completed');
    document.getElementById('modal-mesa-orders').textContent = pedidoMesa.length;
    const tiempoElement = document.getElementById('modal-mesa-time');
    if (mesa.status === 'occupied' && mesa.sessionStart) {
        tiempoElement.textContent = app.getElapsedTime(mesa.sessionStart);
    }else{
        tiempoElement.textContent = '-';
    }
    document.getElementById('mesa-modal').classList.add('active');
    document.getElementById('mesa-modal').style.display = 'flex';
}

function closeMesaModal() {
    const modal = document.getElementById('mesa-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function closeDishModal(){
    const modal = document.getElementById('dish-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    // Limpieza de datos temporales para que no se mezclen
    selectedDishId = null;
    tempImageData = "";
    
    const form = document.getElementById('dish-form');
    if (form) form.reset();
    
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
}

function addEspecialidad() {
    selectedDishId = null; // Indica que es un plato nuevo
    tempImageData = "";
    document.getElementById('dish-modal-title').textContent = "Agregar Plato";
    document.getElementById('dish-form').reset();
    document.getElementById('image-preview-container').style.display = 'none';
    
    const modal = document.getElementById('dish-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
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
    openMesaModal, closeMesaModal, toggleMesa, resetMesa,
    addMenuItem, editMenuItem,deleteMenuItem, renderHistorial,filterHistory,
    approveOrderConfirm, rejectOrderConfirm, markOrderReady,
    refreshOrders, logout, toggleMenuItemStatus: (id) => { 
        app.toggleMenuItem(id); 
        renderMenuManagement(); 
        // Mostrar feedback visual inmediato
        app.showToast("Estado del menú actualizado", "success");
    }
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
    
    // ⭐ NUEVO: Si cambia el menú (activar/desactivar platos)
    if (event.key === CONFIG.STORAGE_KEYS.MENU) {
        console.log('🍽️ Actualización de menú detectada...');
        // Recargar datos del menú en la instancia de la app
        app.menu = app.loadData(CONFIG.STORAGE_KEYS.MENU);
        
        // Si el admin está en la vista de menú, redibujamos al instante
        if (currentView === 'menu') renderMenuManagement();
        app.showToast("Menú actualizado", "info");
    }
    
    if (currentView === 'historial') {
        const dateInput = document.getElementById('filter-date');
        renderHistorial(dateInput ? dateInput.value : null); 
    }
});

function resetMesa() {
    if (!selectedMesaId) return;
    const mesa = app.getMesa(selectedMesaId);
    
    if (confirm(`¿Finalizar sesión de Mesa ${selectedMesaId} y archivar pedidos en el historial?`)) {
        // Marcamos los pedidos de esta mesa como completados antes de limpiar
        app.orders.forEach(order => {
            if (order.mesaId === selectedMesaId && order.status !== 'cancelled') {
                order.status = 'completed';
            }
        });
        
        app.saveData(CONFIG.STORAGE_KEYS.ORDERS, app.orders);
        app.freeMesa(selectedMesaId); 
        app.saveData(CONFIG.STORAGE_KEYS.MESAS, app.mesas);
        
        closeMesaModal();
        renderMesas();
        if(currentView === 'historial') renderHistorial();
        app.showToast(`Mesa ${selectedMesaId} liberada y pedidos archivados`, "success");
    }
}

function deleteMenuItem(id) {
   // Buscamos el plato para saber su nombre en el mensaje de confirmación
    const item = [...app.menu.especialidades, ...app.menu.menuDia].find(i => i.id === id);
    
    if (item && confirm(`¿Estás seguro de que deseas eliminar "${item.name}"?`)) {
        // Filtramos para eliminarlo de la lista
        app.menu.especialidades = app.menu.especialidades.filter(i => i.id !== id);
        app.menu.menuDia = app.menu.menuDia.filter(i => i.id !== id);
        
        // Guardamos los cambios y refrescamos la pantalla
        app.saveData(CONFIG.STORAGE_KEYS.MENU, app.menu);
        renderMenuManagement();
        app.showToast("Plato eliminado correctamente", "success");
    }
}

function editMenuItem(id) {
    const item = [...app.menu.especialidades, ...app.menu.menuDia].find(i => i.id === id);
    if (!item) return;

    selectedDishId = id; // Variable global para saber que estamos editando
    
    // Llenar el formulario con los datos actuales
    document.getElementById('dish-modal-title').textContent = "Editar Plato";
    document.getElementById('dish-name').value = item.name;
    document.getElementById('dish-description').value = item.description || '';
    document.getElementById('dish-price').value = item.price;
    document.getElementById('dish-category').value = app.menu.especialidades.find(i => i.id === id) ? 'especialidad' : 'menu-dia';
    const preview = document.getElementById('dish-image-preview');
    const container = document.getElementById('image-preview-container');
    if(item.image){
        tempImageData = item.image;
        preview.src = item.image;
        container.style.display = 'block';
    }else{
        tempImageData = "";
        container.style.display = 'none';
    }

    // Mostrar el modal
    document.getElementById('dish-modal').classList.add('active');
    document.getElementById('dish-modal').style.display = 'flex';
}
// Variable global para guardar la imagen temporalmente
let tempImageData = ""; 

// Evento para procesar la imagen seleccionada
document.getElementById('dish-image-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        // Validar que el archivo no sea demasiado pesado (máximo 2MB recomendado para localStorage)
        if (file.size > 2 * 1024 * 1024) {
            app.showToast("La imagen es muy pesada. Intenta con una de menos de 2MB", "warning");
            this.value = ""; // Limpiar el input
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            tempImageData = event.target.result; // Aquí se guarda la imagen en formato Base64
            
            // Mostrar la vista previa
            const preview = document.getElementById('dish-image-preview');
            const container = document.getElementById('image-preview-container');
            
            if (preview && container) {
                preview.src = tempImageData;
                container.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
});

function saveDish(e) {
    e.preventDefault(); 
    
    // Capturar datos del formulario
    const name = document.getElementById('dish-name').value;
    const description = document.getElementById('dish-description').value;
    const price = parseFloat(document.getElementById('dish-price').value);
    const category = document.getElementById('dish-category').value;

    if (!name || isNaN(price)) {
        app.showToast("Por favor complete los campos obligatorios", "error");
        return;
    }

    const dishData = {
        id: selectedDishId || Date.now().toString(),
        name: name,
        description: description,
        price: price,
        image: tempImageData, // Imagen capturada en Base64
        active: true
    };

    // Lógica para Guardar o Editar
    if (selectedDishId) {
        let index = app.menu.especialidades.findIndex(i => i.id === selectedDishId);
        if (index !== -1) {
            app.menu.especialidades[index] = dishData;
        } else {
            index = app.menu.menuDia.findIndex(i => i.id === selectedDishId);
            if (index !== -1) app.menu.menuDia[index] = dishData;
        }
    } else {
        if (category === 'especialidad') {
            app.menu.especialidades.push(dishData);
        } else {
            app.menu.menuDia.push(dishData);
        }
    }

    // Persistencia y actualización
    app.saveData(CONFIG.STORAGE_KEYS.MENU, app.menu);
    app.showToast(selectedDishId ? "Plato actualizado" : "Plato agregado", "success");
    
    // Limpieza de interfaz
    closeDishModal();
    renderMenuManagement();
    
    // Resetear valores temporales
    tempImageData = "";
    document.getElementById('dish-form').reset();
    document.getElementById('dish-image-file').value = "";
    document.getElementById('image-preview-container').style.display = 'none';
}

function addMenuItem() {
    selectedDishId = null; // Decimos que es un plato nuevo
    tempImageData = "";    // Reseteamos la imagen para que empiece de cero
    
    // 1. Cambiamos el título del modal
    document.getElementById('dish-modal-title').textContent = "Agregar Nuevo Plato";
    
    // 2. Limpiamos todos los campos de texto del formulario
    const form = document.getElementById('dish-form');
    if (form) form.reset();
    
    // 3. Limpiamos el selector de archivos y ocultamos la vista previa
    document.getElementById('dish-image-file').value = ""; 
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('dish-image-preview').src = "";

    // 4. Abrimos el modal
    const modal = document.getElementById('dish-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Renderiza la lista de pedidos pasados
function renderHistorial(filteredDate = null) {
    const container = document.getElementById('history-list');
    if (!container) return;

    // 1. Filtrar solo pedidos que ya terminaron (completados o cancelados)
    let history = app.orders.filter(order => 
        order.status === 'completed' || order.status === 'cancelled'
    );

    // 2. Si el usuario eligió una fecha en el calendario, filtramos por esa fecha
    if (filteredDate) {
        history = history.filter(order => {
            // Extraemos solo la parte YYYY-MM-DD de la fecha de creación
            const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
            return orderDate === filteredDate;
        });
    }

    // 3. Ordenar para que el pedido más reciente salga primero
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4. Si no hay nada, mostrar mensaje de vacío
    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay pedidos registrados ${filteredDate ? 'para esta fecha' : 'aún'}.</p>
            </div>`;
        return;
    }

    // 5. Generar el HTML de las tarjetas de historial
    container.innerHTML = history.map(order => `
        <div class="history-card">
            <div class="history-header">
                <div>
                    <strong>Mesa ${order.mesaId}</strong>
                    <p style="font-size: 0.8rem; color: #666;">
                        ${new Date(order.createdAt).toLocaleString('es-EC')}
                    </p>
                </div>
                <span class="status-badge ${order.status}">
                    ${order.status === 'completed' ? 'Pagado' : 'Cancelado'}
                </span>
            </div>
            <div class="history-body">
                <p>${order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}</p>
            </div>
            <div class="history-footer">
                <strong>Total: ${app.formatCurrency(order.total)}</strong>
            </div>
        </div>
    `).join('');
}


// Función para el botón "Filtrar"
function filterHistory() {
    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        renderHistorial(dateInput.value);
    }
}

document.getElementById('dish-form').addEventListener('submit', saveDish);