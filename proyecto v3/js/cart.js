/**
 * ============================================
 * CART.JS - GESTIÓN DEL CARRITO DE COMPRAS
 * La Sazón Manaba
 * ============================================
 */

class ShoppingCart {
    constructor() {
        this.items = [];
    }

    // ===== AGREGAR ITEM AL CARRITO =====
    addItem(menuItem, quantity, notes = '') {
        // Verificar si el item ya existe en el carrito
        const existingItemIndex = this.items.findIndex(item => 
            item.id === menuItem.id && item.notes === notes
        );

        if (existingItemIndex !== -1) {
            // Si existe, actualizar cantidad
            this.items[existingItemIndex].quantity += quantity;
        } else {
            // Si no existe, agregarlo
            this.items.push({
                id: menuItem.id,
                name: menuItem.name,
                description: menuItem.description,
                price: menuItem.price,
                quantity: quantity,
                notes: notes,
                customizable: menuItem.customizable
            });
        }

        this.updateDisplay();
        app.showToast(`${menuItem.name} agregado al carrito`, 'success');
    }

    // ===== ACTUALIZAR CANTIDAD =====
    updateQuantity(itemId, notes, newQuantity) {
        const item = this.items.find(i => i.id === itemId && i.notes === notes);
        
        if (item) {
            if (newQuantity <= 0) {
                this.removeItem(itemId, notes);
            } else {
                item.quantity = newQuantity;
                this.updateDisplay();
            }
        }
    }

    // ===== REMOVER ITEM =====
    removeItem(itemId, notes) {
        const itemIndex = this.items.findIndex(i => i.id === itemId && i.notes === notes);
        
        if (itemIndex !== -1) {
            const itemName = this.items[itemIndex].name;
            this.items.splice(itemIndex, 1);
            this.updateDisplay();
            app.showToast(`${itemName} eliminado del carrito`, 'info');
        }
    }

    // ===== LIMPIAR CARRITO =====
    clear() {
        this.items = [];
        this.updateDisplay();
    }

    // ===== OBTENER TOTAL =====
    getTotal() {
        return this.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    // ===== OBTENER CANTIDAD DE ITEMS =====
    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    // ===== VERIFICAR SI ESTÁ VACÍO =====
    isEmpty() {
        return this.items.length === 0;
    }

    // ===== ACTUALIZAR DISPLAY DEL CARRITO =====
    updateDisplay() {
        // Actualizar contador flotante
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        
        if (cartCount) {
            cartCount.textContent = this.getItemCount();
        }
        
        if (cartTotal) {
            cartTotal.textContent = app.formatCurrency(this.getTotal());
        }

        // Actualizar modal del carrito si está abierto
        this.updateCartModal();
    }

    // ===== ACTUALIZAR MODAL DEL CARRITO =====
    updateCartModal() {
        const cartItemsContainer = document.getElementById('cart-items');
        const summaryTotal = document.getElementById('summary-total');
        const summaryFinal = document.getElementById('summary-final');
        
        if (!cartItemsContainer) return;

        // Limpiar contenido
        cartItemsContainer.innerHTML = '';

        if (this.isEmpty()) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <p>Tu carrito está vacío</p>
                    <p style="font-size: 0.9rem; color: var(--gray-600);">
                        Agrega algunos platos deliciosos
                    </p>
                </div>
            `;
            
            // Deshabilitar botón de confirmar
            const confirmBtn = document.getElementById('confirm-order-btn');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
            }
        } else {
            // Mostrar items
            this.items.forEach(item => {
                const cartItem = this.createCartItemElement(item);
                cartItemsContainer.appendChild(cartItem);
            });

            // Habilitar botón de confirmar
            const confirmBtn = document.getElementById('confirm-order-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
            }
        }

        // Actualizar totales
        const total = this.getTotal();
        if (summaryTotal) summaryTotal.textContent = app.formatCurrency(total);
        if (summaryFinal) summaryFinal.textContent = app.formatCurrency(total);
    }

    // ===== CREAR ELEMENTO HTML DE ITEM =====
    createCartItemElement(item) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        const itemTotal = item.price * item.quantity;
        
        div.innerHTML = `
            <div class="cart-item-header">
                <span class="cart-item-name">${item.name}</span>
                <button class="cart-item-remove" onclick="cart.removeItem('${item.id}', '${item.notes}')">
                    ×
                </button>
            </div>
            <div class="cart-item-details">
                <span class="cart-item-quantity">Cantidad: ${item.quantity}</span>
                <span class="cart-item-price">${app.formatCurrency(itemTotal)}</span>
            </div>
            ${item.notes ? `
                <div class="cart-item-notes">
                    📝 ${item.notes}
                </div>
            ` : ''}
        `;
        
        return div;
    }

    // ===== PREPARAR DATOS PARA ENVÍO =====
    prepareOrderData() {
        return this.items.map(item => ({
            itemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes
        }));
    }
}

// ===== FUNCIONES GLOBALES DEL CARRITO =====

// Abrir modal del carrito
function openCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.add('active');
        cart.updateCartModal();
    }
}

// Cerrar modal del carrito
function closeCart() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Confirmar pedido
function confirmOrder() {
    if (cart.isEmpty()) {
        app.showToast('El carrito está vacío', 'warning');
        return;
    }

    const session = app.getSession();
    if (!session) {
        app.showToast('No hay sesión activa', 'error');
        window.location.href = 'index.html';
        return;
    }

    // Crear orden
    const orderItems = cart.prepareOrderData();
    const order = app.createOrder(session.mesaId, orderItems, session.id);

    if (order) {
        // Limpiar carrito
        cart.clear();
        
        // Cerrar modal del carrito
        closeCart();
        
        // Mostrar modal de estado del pedido
        showOrderStatus(order);
        
        app.showToast('¡Pedido enviado exitosamente!', 'success');
    } else {
        app.showToast('Error al crear el pedido', 'error');
    }
}

// Mostrar estado del pedido
function showOrderStatus(order) {
    const modal = document.getElementById('order-status-modal');
    const orderDetails = document.getElementById('order-details');
    
    if (!modal || !orderDetails) return;

    // Construir detalles del pedido
    let detailsHTML = '<div style="text-align: left;">';
    detailsHTML += '<h4 style="margin-bottom: 1rem; color: var(--secondary);">Detalles del Pedido</h4>';
    
    order.items.forEach(item => {
        detailsHTML += `
            <div style="background: white; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong>${item.name}</strong>
                    <strong>${app.formatCurrency(item.price * item.quantity)}</strong>
                </div>
                <div style="color: var(--gray-600); font-size: 0.9rem;">
                    Cantidad: ${item.quantity} × ${app.formatCurrency(item.price)}
                </div>
                ${item.notes ? `
                    <div style="font-size: 0.85rem; color: var(--gray-600); margin-top: 0.25rem; font-style: italic;">
                        📝 ${item.notes}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    detailsHTML += `
        <div style="background: var(--gray-800); color: white; padding: 1rem; border-radius: 8px; margin-top: 1rem; display: flex; justify-content: space-between; font-size: 1.2rem;">
            <strong>Total:</strong>
            <strong>${app.formatCurrency(order.total)}</strong>
        </div>
    `;
    detailsHTML += '</div>';
    
    orderDetails.innerHTML = detailsHTML;
    
    // Guardar ID de orden actual
    modal.dataset.orderId = order.id;
    
    modal.classList.add('active');
    
    // Iniciar verificación de estado
    startOrderStatusCheck(order.id);
}

// Verificar estado del pedido periódicamente
let statusCheckInterval;
let lastOrderStatus = '';

function startOrderStatusCheck(orderId) {
    // Limpiar intervalo anterior si existe
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }

    console.log('🔄 Iniciando verificación de estado para pedido:', orderId);
    lastOrderStatus = 'pending';

    statusCheckInterval = setInterval(() => {
        // Recargar los datos del app desde localStorage para obtener cambios del admin
        app.orders = app.loadData(CONFIG.STORAGE_KEYS.ORDERS) || [];
        
        const order = app.getOrder(orderId);
        
        if (!order) {
            console.log('❌ Pedido no encontrado, deteniendo verificación');
            clearInterval(statusCheckInterval);
            return;
        }

        console.log('📊 Estado actual del pedido:', order.status);

        // Detectar cambio de estado
        if (order.status !== lastOrderStatus) {
            console.log(`🔔 Cambio de estado detectado: ${lastOrderStatus} → ${order.status}`);
            lastOrderStatus = order.status;
        }

        updateOrderStatusDisplay(order);

        // Si el pedido fue confirmado, deshabilitar botones de edición
        if (order.status === 'confirmed' || order.status === 'preparing') {
            disableOrderEditing();
        }

        // Si el pedido está listo, mostrar notificación
        if (order.status === 'ready') {
            console.log('✅ Pedido listo! Mostrando notificación');
            clearInterval(statusCheckInterval);
            notifyOrderReady(order);
        }

        // Si el pedido fue cancelado, cerrar modal
        if (order.status === 'cancelled') {
            clearInterval(statusCheckInterval);
            closeOrderStatus();
            app.showToast('Tu pedido fue cancelado', 'warning');
        }
    }, 1500); // Verificar cada 1.5 segundos
}

// Actualizar display del estado
function updateOrderStatusDisplay(order) {
    const modal = document.getElementById('order-status-modal');
    if (!modal) return;

    const statusIcon = modal.querySelector('.status-icon');
    const statusTitle = modal.querySelector('h2');
    const statusDesc = modal.querySelector('.status-description');

    const statusConfig = {
        pending: {
            icon: '⏳',
            title: 'Pedido Enviado',
            desc: 'Esperando confirmación del mesero...'
        },
        confirmed: {
            icon: '👨‍🍳',
            title: 'Pedido Confirmado',
            desc: 'Tu pedido está siendo preparado en la cocina'
        },
        preparing: {
            icon: '🍳',
            title: 'Preparando',
            desc: 'El chef está preparando tu pedido'
        },
        ready: {
            icon: '✅',
            title: '¡Pedido Listo!',
            desc: 'Tu pedido está listo. ¡Buen provecho!'
        }
    };

    const config = statusConfig[order.status] || statusConfig.pending;
    
    if (statusIcon) statusIcon.textContent = config.icon;
    if (statusTitle) statusTitle.textContent = config.title;
    if (statusDesc) statusDesc.textContent = config.desc;
}

// Deshabilitar edición del pedido
function disableOrderEditing() {
    const editBtn = document.getElementById('edit-order-btn');
    const cancelBtn = document.getElementById('cancel-order-btn');
    const helpNote = document.querySelector('.help-note');

    if (editBtn) {
        editBtn.disabled = true;
        editBtn.style.opacity = '0.5';
        editBtn.style.cursor = 'not-allowed';
    }

    if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.style.opacity = '0.5';
        cancelBtn.style.cursor = 'not-allowed';
    }

    if (helpNote) {
        helpNote.textContent = '⚠️ El pedido ha sido confirmado y no puede ser modificado';
        helpNote.style.color = 'var(--warning)';
    }
}

// Notificar que el pedido está listo
function notifyOrderReady(order) {
    console.log('🎉 Notificando que el pedido está listo');
    
    // Mostrar toast grande
    app.showToast('🎉 ¡Tu pedido está listo! ¡Buen provecho!', 'success');
    
    // Actualizar el display una última vez
    updateOrderStatusDisplay(order);
    
    // Cambiar botones para dar opciones al cliente
    const orderActions = document.getElementById('order-actions');
    if (orderActions) {
        orderActions.innerHTML = `
            <button class="btn-success" onclick="requestPayment()" style="flex: 1;">
                💳 Solicitar Cuenta
            </button>
            <button class="btn-primary" onclick="orderMoreItems()" style="flex: 1;">
                🍽️ Pedir Más
            </button>
        `;
    }
    
    // Cambiar el texto de ayuda
    const helpNote = document.querySelector('.help-note');
    if (helpNote) {
        helpNote.innerHTML = '🎉 Tu pedido está listo. Puedes solicitar la cuenta o pedir algo más.';
        helpNote.style.color = 'var(--success)';
        helpNote.style.fontWeight = '600';
    }
}

// Editar pedido (solo si está pendiente)
function editOrder() {
    const modal = document.getElementById('order-status-modal');
    const orderId = modal?.dataset.orderId;
    
    if (!orderId) return;
    
    const order = app.getOrder(orderId);
    
    if (!order || order.status !== 'pending') {
        app.showToast('No se puede editar este pedido', 'warning');
        return;
    }

    // Cargar items al carrito
    cart.clear();
    order.items.forEach(item => {
        const menuItem = app.getMenuItem(item.itemId);
        if (menuItem) {
            cart.addItem(menuItem, item.quantity, item.notes);
        }
    });

    // Eliminar el pedido
    app.deleteOrder(orderId);

    // Cerrar modal de estado
    closeOrderStatus();

    // Abrir carrito
    openCart();

    app.showToast('Pedido cargado al carrito para edición', 'info');
}

// Cancelar pedido
function cancelOrder() {
    const modal = document.getElementById('order-status-modal');
    const orderId = modal?.dataset.orderId;
    
    if (!orderId) return;
    
    const order = app.getOrder(orderId);
    
    if (!order || order.status !== 'pending') {
        app.showToast('No se puede cancelar este pedido', 'warning');
        return;
    }

    if (confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
        app.deleteOrder(orderId);
        closeOrderStatus();
        app.showToast('Pedido cancelado', 'info');
    }
}

// Cerrar modal de estado del pedido
function closeOrderStatus() {
    const modal = document.getElementById('order-status-modal');
    if (modal) {
        modal.classList.remove('active');
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
        }
    }
}

// Cerrar modal y continuar navegando (mantener pedido activo)
function closeOrderStatusAndContinue() {
    const modal = document.getElementById('order-status-modal');
    const orderId = modal?.dataset.orderId;
    
    if (orderId) {
        const order = app.getOrder(orderId);
        if (order) {
            console.log('✅ Pedido activo, puedes seguir navegando');
            app.showToast('Tu pedido sigue activo. Te notificaremos cuando esté listo.', 'info');
        }
    }
    
    closeOrderStatus();
}

// Solicitar pago
function requestPayment() {
    const modal = document.getElementById('order-status-modal');
    const orderId = modal?.dataset.orderId;
    
    if (!orderId) return;
    
    const order = app.getOrder(orderId);
    if (!order) return;

    closeOrderStatus();
    showPaymentModal(order);
}

// Pedir más items (después de que el pedido esté listo)
function orderMoreItems() {
    closeOrderStatus();
    app.showToast('Puedes seguir agregando más items al menú', 'info');
    
    // El cliente puede seguir navegando el menú y agregando al carrito
    // La mesa sigue ocupada hasta que solicite la cuenta y pague
}

// Mostrar modal de pago
function showPaymentModal(order) {
    const modal = document.getElementById('payment-modal');
    const paymentItems = document.getElementById('payment-items');
    const paymentAmount = document.getElementById('payment-amount');
    
    if (!modal || !paymentItems || !paymentAmount) return;

    // Construir items
    let itemsHTML = '';
    order.items.forEach(item => {
        itemsHTML += `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--gray-200);">
                <span>${item.quantity}x ${item.name}</span>
                <span>${app.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `;
    });
    
    paymentItems.innerHTML = itemsHTML;
    paymentAmount.textContent = app.formatCurrency(order.total);
    
    modal.dataset.orderId = order.id;
    modal.classList.add('active');
}

// Cerrar modal de pago
function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Solicitar cuenta
function requestBill() {
    const modal = document.getElementById('payment-modal');
    const orderId = modal?.dataset.orderId;
    
    if (!orderId) return;
    
    const order = app.getOrder(orderId);
    if (!order) return;

    // Cambiar estado a completed
    app.updateOrderStatus(orderId, 'completed');
    
    closePaymentModal();
    
    // Mostrar modal de finalización
    showCompletionModal();
}

// Mostrar modal de finalización con opciones
function showCompletionModal() {
    const session = app.getSession();
    
    // Crear modal personalizado
    const modalHTML = `
        <div id="completion-modal" class="modal active" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div style="font-size: 5rem; margin: 2rem 0;">✅</div>
                <h2 style="color: var(--success); margin-bottom: 1rem;">¡Cuenta Solicitada!</h2>
                <p style="color: var(--gray-600); margin-bottom: 2rem;">
                    El mesero procesará tu pago en breve
                </p>
                
                <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                    <p style="font-weight: 600; margin-bottom: 1rem;">¿Qué deseas hacer ahora?</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <button class="btn-primary" onclick="makeNewOrder()" style="width: 100%;">
                        🍽️ Realizar Otro Pedido
                    </button>
                    <button class="btn-secondary" onclick="finishAndLeave()" style="width: 100%;">
                        👋 Finalizar y Liberar Mesa
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Agregar al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Hacer un nuevo pedido (mantener la mesa)
function makeNewOrder() {
    // Cerrar modal de completación
    const completionModal = document.getElementById('completion-modal');
    if (completionModal) {
        completionModal.remove();
    }
    
    // Limpiar carrito
    cart.clear();
    
    app.showToast('Puedes realizar un nuevo pedido', 'success');
}

// Finalizar y liberar la mesa
function finishAndLeave() {
    const session = app.getSession();
    
    if (session) {
        // Liberar la mesa
        app.freeMesa(session.mesaId);
        
        // Limpiar sesión
        app.clearSession();
        
        // Limpiar carrito
        cart.clear();
    }
    
    // Cerrar modal
    const completionModal = document.getElementById('completion-modal');
    if (completionModal) {
        completionModal.remove();
    }
    
    // Mostrar mensaje de despedida
    alert('✨ ¡Gracias por tu visita a La Sazón Manaba!\n\n¡Esperamos verte pronto! 🍽️');
    
    // Redirigir a la página principal
    window.location.href = 'index.html';
}

// ===== VERIFICAR PEDIDOS ACTIVOS DEL CLIENTE =====
let globalOrderCheckInterval;

function startGlobalOrderCheck() {
    // Limpiar intervalo anterior si existe
    if (globalOrderCheckInterval) {
        clearInterval(globalOrderCheckInterval);
    }
    
    globalOrderCheckInterval = setInterval(() => {
        const session = app.getSession();
        if (!session) {
            clearInterval(globalOrderCheckInterval);
            return;
        }
        
        // Recargar pedidos desde localStorage
        app.orders = app.loadData(CONFIG.STORAGE_KEYS.ORDERS) || [];
        
        // Buscar pedidos de esta mesa
        const mesaOrders = app.getMesaOrders(session.mesaId);
        
        // Verificar si hay algún pedido listo
        mesaOrders.forEach(order => {
            if (order.status === 'ready') {
                // Verificar si ya se mostró la notificación
                const notifiedKey = `notified_${order.id}`;
                if (!sessionStorage.getItem(notifiedKey)) {
                    // Mostrar notificación grande
                    showReadyNotification(order);
                    sessionStorage.setItem(notifiedKey, 'true');
                }
            }
        });
    }, 3000); // Verificar cada 3 segundos
}

// Mostrar notificación grande cuando el pedido está listo
function showReadyNotification(order) {
    // Reproducir sonido (opcional, usando beep nativo del navegador)
    if (window.AudioContext || window.webkitAudioContext) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('No se pudo reproducir sonido');
        }
    }
    
    // Mostrar toast especial
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.style.cssText = `
        padding: 2rem;
        font-size: 1.2rem;
        animation: pulse 0.5s ease-in-out 3;
        border: 3px solid var(--success);
        background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
        color: var(--gray-900);
        max-width: 90vw;
    `;
    
    toast.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <div style="font-weight: 700; margin-bottom: 0.5rem;">¡Tu pedido está listo!</div>
            <div style="font-size: 1rem; opacity: 0.9;">¡Buen provecho!</div>
            <button onclick="showOrderStatusFromNotification('${order.id}')" 
                    style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--success); 
                           color: white; border: none; border-radius: 8px; font-weight: 700; 
                           cursor: pointer; font-size: 1rem;">
                Ver Pedido
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Mantener visible por más tiempo
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 10000); // 10 segundos
}

// Mostrar estado del pedido desde notificación
function showOrderStatusFromNotification(orderId) {
    const order = app.getOrder(orderId);
    if (order) {
        showOrderStatus(order);
    }
}

// ===== INSTANCIA GLOBAL DEL CARRITO =====
const cart = new ShoppingCart();
window.cart = cart;

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.orderMoreItems = orderMoreItems;
window.makeNewOrder = makeNewOrder;
window.finishAndLeave = finishAndLeave;
window.closeOrderStatusAndContinue = closeOrderStatusAndContinue;
window.showOrderStatusFromNotification = showOrderStatusFromNotification;