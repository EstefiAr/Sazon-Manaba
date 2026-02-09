/**
 * ============================================
 * APP.JS - CONTROLADOR PRINCIPAL DEL SISTEMA
 * Cafeteria Endulce - Sistema de Pedidos
 * ============================================
 */

// ===== CONFIGURACIÓN GLOBAL =====
const CONFIG = {
    RESTAURANT_NAME: 'Cafeteria Endulce',
    BASE_URL: window.location.origin,
    SESSION_TIMEOUT: 600000, // 10 minutos en milisegundos
    INACTIVITY_WARNING: 540000, // 9 minutos
    MAX_MESAS: 12,
    STORAGE_KEYS: {
        MESAS: 'cafeteria_mesas',
        MENU: 'cafeteria_menu',
        ORDERS: 'cafeteria_orders',
        HISTORY: 'cafeteria_history',
        SESSION: 'cafeteria_session'
    }
};

// ===== CLASE PRINCIPAL DE LA APLICACIÓN =====
class RestaurantApp {
    constructor() {
        this.mesas = this.loadData(CONFIG.STORAGE_KEYS.MESAS) || this.initializeMesas();
        this.menu = this.loadData(CONFIG.STORAGE_KEYS.MENU) || this.initializeMenu();
        this.orders = this.loadData(CONFIG.STORAGE_KEYS.ORDERS) || [];
        this.history = this.loadData(CONFIG.STORAGE_KEYS.HISTORY) || [];
        this.currentSession = this.loadData(CONFIG.STORAGE_KEYS.SESSION) || null;
    }

    // ===== INICIALIZACIÓN DE DATOS =====
    initializeMesas() {
        const mesas = [];
        for (let i = 1; i <= CONFIG.MAX_MESAS; i++) {
            mesas.push({
                id: i,
                status: 'available', // inactive, available, occupied
                sessionStart: null,
                customerId: null,
                orders: [],
                lastActivity: null
            });
        }
        return mesas;
    }

    initializeMenu() {
        return {
            especialidades: [
                {
                    id: 'esp-1',
                    name: 'Espresso Italiano',
                    description: 'Cuerpo intenso con notas de chocolate amargo y crema persistente',
                    price: 2.50,
                    image: 'platos/espresso.jpg',
                    active: true,
                    customizable: true,
                    category: 'especialidad'
                },
                {
                    id: 'esp-2',
                    name: 'Cappuccino Vainilla',
                    description: 'Espresso con leche cremosa al vapor y un toque suave de vainilla francesa',
                    price: 3.85,
                    image: 'platos/capuchino.jpg',
                    active: true,
                    customizable: true,
                    category: 'especialidad'
                },
                {
                    id: 'esp-3',
                    name: 'Latte Art Caramelo',
                    description: 'Suave combinación de leche y café con hilos de caramelo artesanal',
                    price: 4.25,
                    image: 'platos/latte.jpg',
                    active: true,
                    customizable: true,
                    category: 'especialidad'
                },
                {
                    id: 'esp-4',
                    name: 'Mocha Blanco Frost',
                    description: 'Café premium mezclado con chocolate blanco y topping de nata',
                    price: 4.50,
                    image: 'platos/moca.jpg',
                    active: true,
                    customizable: true,
                    category: 'especialidad'
                }
            ],
            menuDia: [
                {
                    id: 'dia-1',
                    name: 'Desayuno Criollo',
                    description: 'Bolón de queso, huevo frito y café pasado',
                    price: 5.50,
                    image: 'platos/desayuno.jpg',
                    active: true,
                    customizable: true,
                    category: 'menu-dia'
                },
                {
                    id: 'dia-2',
                    name: 'Tostadas Francesas',
                    description: 'Pan brioche con miel de maple y frutas de estación',
                    price: 4.50,
                    image: 'platos/tostadas.jpg',
                    active: true,
                    customizable: true,
                    category: 'menu-dia'
                },
                {
                    id: 'dia-3',
                    name: 'Tiramisú de la Casa',
                    description: 'Capas sedosas de mascarpone, bizcochos bañados en espresso y un toque de cacao puro',
                    price: 4.75,
                    image: 'platos/tiramisu.jpg',
                    active: true,
                    customizable: false,
                    category: 'menu-dia'
                }
            ]
        };
    }

    // ===== GESTIÓN DE ALMACENAMIENTO LOCAL =====
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error cargando ${key}:`, error);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error guardando ${key}:`, error);
            return false;
        }
    }

    // ===== GESTIÓN DE MESAS =====
    getMesa(mesaId) {
        return this.mesas.find(m => m.id === parseInt(mesaId));
    }

    updateMesa(mesaId, updates) {
        const mesa = this.getMesa(mesaId);
        if (mesa) {
            Object.assign(mesa, updates);
            this.saveData(CONFIG.STORAGE_KEYS.MESAS, this.mesas);
            return true;
        }
        return false;
    }

    activateMesa(mesaId) {
        return this.updateMesa(mesaId, {
            status: 'available',
            sessionStart: null,
            customerId: null,
            orders: []
        });
    }

    deactivateMesa(mesaId) {
        return this.updateMesa(mesaId, {
            status: 'inactive',
            sessionStart: null,
            customerId: null,
            orders: []
        });
    }

    occupyMesa(mesaId, customerId) {
        return this.updateMesa(mesaId, {
            status: 'occupied',
            sessionStart: Date.now(),
            customerId: customerId,
            lastActivity: Date.now()
        });
    }

    freeMesa(mesaId) {
        return this.updateMesa(mesaId, {
            status: 'available',
            sessionStart: null,
            customerId: null,
            orders: [],
            lastActivity: null
        });
    }

    resetMesa(mesaId) {
        const mesa = this.getMesa(mesaId);
        if (mesa) {
            // Cancelar pedidos pendientes
            this.orders = this.orders.filter(o => o.mesaId !== mesaId);
            this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);
            
            return this.freeMesa(mesaId);
        }
        return false;
    }

    checkMesaInactivity(mesaId) {
        const mesa = this.getMesa(mesaId);
        if (!mesa || mesa.status !== 'occupied') return false;

        const inactiveTime = Date.now() - mesa.lastActivity;
        const hasOrders = mesa.orders.length > 0;

        // Si no hay pedidos y pasaron 10 minutos, liberar mesa
        if (!hasOrders && inactiveTime > CONFIG.SESSION_TIMEOUT) {
            this.freeMesa(mesaId);
            return true;
        }

        return false;
    }

    updateMesaActivity(mesaId) {
        return this.updateMesa(mesaId, {
            lastActivity: Date.now()
        });
    }

    // ===== GESTIÓN DEL MENÚ =====
    getActiveEspecialidades() {
        return this.menu.especialidades.filter(item => item.active);
    }

    getActiveMenuDia() {
        return this.menu.menuDia.filter(item => item.active);
    }

    getMenuItem(itemId) {
        const allItems = [...this.menu.especialidades, ...this.menu.menuDia];
        return allItems.find(item => item.id === itemId);
    }

    toggleMenuItem(itemId) {
        const allItems = [...this.menu.especialidades, ...this.menu.menuDia];
        const item = allItems.find(i => i.id === itemId);
        
        if (item) {
            item.active = !item.active;
            this.saveData(CONFIG.STORAGE_KEYS.MENU, this.menu);
            return true;
        }
        return false;
    }

    addMenuItem(itemData) {
        const newItem = {
            id: `${itemData.category}-${Date.now()}`,
            ...itemData,
            active: true
        };

        if (itemData.category === 'especialidad') {
            this.menu.especialidades.push(newItem);
        } else {
            this.menu.menuDia.push(newItem);
        }

        this.saveData(CONFIG.STORAGE_KEYS.MENU, this.menu);
        return newItem;
    }

    deleteMenuItem(itemId) {
        this.menu.especialidades = this.menu.especialidades.filter(i => i.id !== itemId);
        this.menu.menuDia = this.menu.menuDia.filter(i => i.id !== itemId);
        this.saveData(CONFIG.STORAGE_KEYS.MENU, this.menu);
        return true;
    }

    // ===== GESTIÓN DE PEDIDOS =====
    createOrder(mesaId, items, customerId) {
        const order = {
            id: `ORD-${Date.now()}`,
            mesaId: parseInt(mesaId),
            customerId: customerId,
            items: items,
            status: 'pending', // pending, confirmed, preparing, ready, completed, cancelled
            total: this.calculateTotal(items),
            createdAt: Date.now(),
            confirmedAt: null,
            readyAt: null,
            completedAt: null
        };

        this.orders.push(order);
        this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);

        // Agregar pedido a la mesa
        const mesa = this.getMesa(mesaId);
        if (mesa) {
            mesa.orders.push(order.id);
            this.updateMesaActivity(mesaId);
        }

        return order;
    }

    getOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    getMesaOrders(mesaId) {
        return this.orders.filter(o => o.mesaId === parseInt(mesaId));
    }

    getPendingOrders() {
        return this.orders.filter(o => o.status === 'pending');
    }

    getActiveOrders() {
        return this.orders.filter(o => 
            ['pending', 'confirmed', 'preparing'].includes(o.status)
        );
    }

    updateOrderStatus(orderId, status) {
        const order = this.getOrder(orderId);
        if (!order) return false;

        order.status = status;

        switch (status) {
            case 'confirmed':
                order.confirmedAt = Date.now();
                break;
            case 'ready':
                order.readyAt = Date.now();
                break;
            case 'completed':
                order.completedAt = Date.now();
                this.moveToHistory(order);
                break;
            case 'cancelled':
                order.completedAt = Date.now();
                this.moveToHistory(order);
                break;
        }

        this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);
        return true;
    }

    updateOrderItems(orderId, newItems) {
        const order = this.getOrder(orderId);
        if (!order || order.status !== 'pending') return false;

        order.items = newItems;
        order.total = this.calculateTotal(newItems);
        this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);
        return true;
    }

    deleteOrder(orderId) {
        const order = this.getOrder(orderId);
        if (!order || order.status !== 'pending') return false;

        this.orders = this.orders.filter(o => o.id !== orderId);
        this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);

        // Remover de la mesa
        const mesa = this.getMesa(order.mesaId);
        if (mesa) {
            mesa.orders = mesa.orders.filter(id => id !== orderId);
            this.saveData(CONFIG.STORAGE_KEYS.MESAS, this.mesas);
        }

        return true;
    }

    calculateTotal(items) {
        return items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    moveToHistory(order) {
        this.history.push({
            ...order,
            historyDate: Date.now()
        });
        this.saveData(CONFIG.STORAGE_KEYS.HISTORY, this.history);
        
        // Remover de pedidos activos
        this.orders = this.orders.filter(o => o.id !== order.id);
        this.saveData(CONFIG.STORAGE_KEYS.ORDERS, this.orders);
    }

    // ===== GESTIÓN DE SESIÓN DE CLIENTE =====
    createSession(mesaId) {
        const sessionId = `SESSION-${Date.now()}`;
        const session = {
            id: sessionId,
            mesaId: parseInt(mesaId),
            startTime: Date.now(),
            lastActivity: Date.now(),
            cart: []
        };

        this.currentSession = session;
        this.saveData(CONFIG.STORAGE_KEYS.SESSION, session);
        
        return session;
    }

    getSession() {
        return this.currentSession;
    }

    updateSessionActivity() {
        if (this.currentSession) {
            this.currentSession.lastActivity = Date.now();
            this.saveData(CONFIG.STORAGE_KEYS.SESSION, this.currentSession);
        }
    }

    isSessionExpired() {
        if (!this.currentSession) return true;
        
        const inactiveTime = Date.now() - this.currentSession.lastActivity;
        return inactiveTime > CONFIG.SESSION_TIMEOUT;
    }

    clearSession() {
        this.currentSession = null;
        localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
    }

    // ===== UTILIDADES =====
    formatCurrency(amount) {
        return `$${parseFloat(amount).toFixed(2)}`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-EC', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDateTime(timestamp) {
        return `${this.formatDate(timestamp)} ${this.formatTime(timestamp)}`;
    }

    getElapsedTime(startTime) {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // ===== NOTIFICACIONES =====
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

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

        toastContainer.appendChild(toast);

        // Auto-eliminar después de 3 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ===== ESTADÍSTICAS =====
    getStats() {
        return {
            totalMesas: this.mesas.length,
            mesasActivas: this.mesas.filter(m => m.status !== 'inactive').length,
            mesasOcupadas: this.mesas.filter(m => m.status === 'occupied').length,
            pedidosPendientes: this.getPendingOrders().length,
            pedidosActivos: this.getActiveOrders().length,
            ventasHoy: this.getVentasHoy()
        };
    }

    getVentasHoy() {
        const today = new Date().setHours(0, 0, 0, 0);
        const ventasHoy = this.history.filter(order => {
            const orderDate = new Date(order.completedAt).setHours(0, 0, 0, 0);
            return orderDate === today && order.status === 'completed';
        });

        return ventasHoy.reduce((total, order) => total + order.total, 0);
    }
}

// ===== INSTANCIA GLOBAL =====
const app = new RestaurantApp();

// ===== EXPORTAR PARA USO GLOBAL =====
window.RestaurantApp = app;
window.CONFIG = CONFIG;

console.log('☕ Cafetería Endulce - Sistema inicializado correctamente');
