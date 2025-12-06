// Global variables
let guests = [];
let rooms = [];
let coupons = [];
let reservations = [];
let allRooms = [];
let roomTypes = [];
let allCoupons = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    // Initialize based on current page
    if (currentPage === '/reservations') {
        initReservationsPage();
    } else if (currentPage === '/guests') {
        initGuestsPage();
    } else if (currentPage === '/rooms') {
        initRoomsPage();
    } else if (currentPage === '/coupons') {
        initCouponsPage();
    }
});

// Initialize Reservations Page
function initReservationsPage() {
    loadGuests();
    loadRooms();
    loadCoupons();
    loadReservations();
    setupReservationForm();
    setupEditForm();
    setupModal();
}

// Initialize Guests Page
function initGuestsPage() {
    loadGuests();
    setupGuestForm();
    setupGuestEditForm();
    setupModal();
}

// Initialize Rooms Page
function initRoomsPage() {
    loadRoomTypes();
    loadAllRooms();
    setupRoomTypeForm();
    setupRoomForm();
    setupRoomModals();
}

// Initialize Coupons Page
function initCouponsPage() {
    loadAllCoupons();
    setupCouponForm();
    setupCouponModal();
}

// Loading functions
async function loadGuests() {
    try {
        const response = await fetch('/api/guests');
        guests = await response.json();
        
        // Populate guest select dropdown if it exists (reservations page)
        const guestSelect = document.getElementById('guest-select');
        if (guestSelect) {
            guestSelect.innerHTML = '<option value="">-- Select Guest --</option>';
            guests.forEach(guest => {
                const option = document.createElement('option');
                option.value = guest.guest_id;
                option.textContent = `${guest.name} (${guest.email})`;
                guestSelect.appendChild(option);
            });
        }

        // Display guest list if container exists (guests page)
        displayGuestsList();
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms/available');
        rooms = await response.json();
        
        const roomSelect = document.getElementById('room-select');
        roomSelect.innerHTML = '<option value="">-- Select Room --</option>';
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.room_number;
            option.textContent = `Room ${room.room_number} - ${room.room_type} ($${room.price_per_night}/night)`;
            roomSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

async function loadCoupons() {
    try {
        const response = await fetch('/api/coupons');
        coupons = await response.json();
        
        const couponSelect = document.getElementById('coupon-select');
        couponSelect.innerHTML = '<option value="">-- No Coupon --</option>';
        
        coupons.forEach(coupon => {
            const option = document.createElement('option');
            option.value = coupon.coupon_id;
            option.textContent = `${coupon.coupon_id} - ${coupon.discount_amt}% off (${coupon.qty} available)`;
            couponSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
        reservations = await response.json();
        displayReservations();
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

// Display reservations
function displayReservations() {
    const container = document.getElementById('reservations-list');
    if (!container) return; // Container doesn't exist on this page
    
    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Reservations Found</h3>
                <p>Create your first reservation to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reservations.map(res => `
        <div class="reservation-card">
            <div class="reservation-header">
                <h3>Reservation #${res.reservation_id}</h3>
                <div class="reservation-actions">
                    <button class="btn btn-secondary" onclick="openEditModal(${res.reservation_id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteReservation(${res.reservation_id})">Delete</button>
                </div>
            </div>
            <div class="reservation-details">
                <div class="detail-item">
                    <span class="detail-label">Guest Name</span>
                    <span class="detail-value">${res.guest_name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${res.email}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Room Number</span>
                    <span class="detail-value">${res.room_number} (${res.room_type})</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${res.phone}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Check-in Date</span>
                    <span class="detail-value">${formatDate(res.check_in_date)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Check-out Date</span>
                    <span class="detail-value">${formatDate(res.check_out_date)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Number of Guests</span>
                    <span class="detail-value">${res.number_of_guests}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Amount</span>
                    <span class="detail-value">${res.transaction_amt}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">${res.pay_method}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Payment Status</span>
                    <span class="detail-value">
                        <span class="status-badge ${res.pay_status === 'Paid' ? 'status-paid' : 'status-pending'}">
                            ${res.pay_status}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// Display guests list
function displayGuestsList() {
    const container = document.getElementById('guests-list');
    if (!container) return; // Container doesn't exist on this page
    
    if (guests.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No guests registered yet.</p></div>';
        return;
    }

    container.innerHTML = guests.map(guest => `
        <div class="guest-card">
            <h4>${guest.name}</h4>
            <p><strong>Email:</strong> ${guest.email}</p>
            <p><strong>Phone:</strong> ${guest.phone}</p>
            <div class="guest-actions">
                <button class="btn btn-secondary" onclick="openEditGuestModal(${guest.guest_id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteGuest(${guest.guest_id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Form handlers
function setupReservationForm() {
    const form = document.getElementById('reservation-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            guest_id: parseInt(document.getElementById('guest-select').value),
            room_number: document.getElementById('room-select').value,
            check_in_date: document.getElementById('check-in').value,
            check_out_date: document.getElementById('check-out').value,
            number_of_guests: parseInt(document.getElementById('num-guests').value),
            pay_method: document.getElementById('pay-method').value,
            coupon_id: document.getElementById('coupon-select').value || null
        };

        // Validate dates
        if (new Date(data.check_out_date) <= new Date(data.check_in_date)) {
            alert('Check-out date must be after check-in date');
            return;
        }

        try {
            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Reservation created successfully!');
                e.target.reset();
                loadReservations();
                loadRooms();
                loadCoupons();
            } else {
                const error = await response.json();
                alert('Error creating reservation: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating reservation');
        }
    });
}

function setupGuestForm() {
    const form = document.getElementById('guest-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('guest-name').value,
            email: document.getElementById('guest-email').value,
            phone: document.getElementById('guest-phone').value
        };

        try {
            const response = await fetch('/api/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Guest registered successfully!');
                e.target.reset();
                loadGuests();
            } else {
                alert('Error registering guest');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error registering guest');
        }
    });
}

function setupEditForm() {
    const form = document.getElementById('edit-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const reservationId = document.getElementById('edit-reservation-id').value;
        const data = {
            check_in_date: document.getElementById('edit-check-in').value,
            check_out_date: document.getElementById('edit-check-out').value,
            number_of_guests: parseInt(document.getElementById('edit-num-guests').value)
        };

        try {
            const response = await fetch(`/api/reservations/${reservationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Reservation updated successfully!');
                closeEditModal();
                loadReservations();
            } else {
                alert('Error updating reservation');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating reservation');
        }
    });
}

function setupGuestEditForm() {
    const form = document.getElementById('edit-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const guestId = document.getElementById('edit-guest-id').value;
        const data = {
            name: document.getElementById('edit-guest-name').value,
            email: document.getElementById('edit-guest-email').value,
            phone: document.getElementById('edit-guest-phone').value
        };

        try {
            const response = await fetch(`/api/guests/${guestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Guest updated successfully!');
                closeEditModal();
                loadGuests();
            } else {
                alert('Error updating guest');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating guest');
        }
    });
}

// Modal functions
function setupModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal) return; // Modal doesn't exist on this page
    
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    });
}

function openEditModal(reservationId) {
    const reservation = reservations.find(r => r.reservation_id === reservationId);
    
    if (reservation) {
        document.getElementById('edit-reservation-id').value = reservation.reservation_id;
        document.getElementById('edit-check-in').value = reservation.check_in_date;
        document.getElementById('edit-check-out').value = reservation.check_out_date;
        document.getElementById('edit-num-guests').value = reservation.number_of_guests;
        
        document.getElementById('edit-modal').classList.add('active');
    }
}

function openEditGuestModal(guestId) {
    const guest = guests.find(g => g.guest_id === guestId);
    if (guest) {
        document.getElementById('edit-guest-id').value = guest.guest_id;
        document.getElementById('edit-guest-name').value = guest.name;
        document.getElementById('edit-guest-email').value = guest.email;
        document.getElementById('edit-guest-phone').value = guest.phone;

        document.getElementById('edit-modal').classList.add('active');
    }
}
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

async function deleteReservation(reservationId) {
    if (!confirm('Are you sure you want to delete this reservation?')) {
        return;
    }

    try {
        const response = await fetch(`/api/reservations/${reservationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Reservation deleted successfully!');
            loadReservations();
            loadRooms();
        } else {
            alert('Error deleting reservation');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting reservation');
    }
}

async function deleteGuest(guestId) {
    if (!confirm('Are you sure you want to delete this guest?')) {
        return;
    }

    try {
        const response = await fetch(`/api/guests/${guestId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Guest deleted successfully!');
            loadGuests();
        } else {
            alert('Deletion failed. Make sure the guest has no associated reservations.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting guest');
    }
}

// Utility functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Room Types functions
function setupRoomTypeForm() {
    const form = document.getElementById('roomtype-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('roomtype-name').value,
            price_per_night: parseInt(document.getElementById('roomtype-price').value)
        };

        try {
            const response = await fetch('/api/roomtypes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Room type created successfully!');
                e.target.reset();
                loadRoomTypes();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating room type');
        }
    });
}

function openEditRoomTypeModal(typeId) {
    const type = roomTypes.find(t => t.type_id === typeId);
    
    if (type) {
        document.getElementById('edit-roomtype-id').value = type.type_id;
        document.getElementById('edit-roomtype-name').value = type.name;
        document.getElementById('edit-roomtype-price').value = type.price_per_night;
        document.getElementById('edit-roomtype-modal').classList.add('active');
    }
}

function closeEditRoomTypeModal() {
    document.getElementById('edit-roomtype-modal').classList.remove('active');
}

async function deleteRoomType(typeId) {
    if (!confirm('Are you sure you want to delete this room type? This will fail if any rooms use this type.')) {
        return;
    }

    try {
        const response = await fetch(`/api/roomtypes/${typeId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Room type deleted successfully!');
            loadRoomTypes();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting room type');
    }
}

// Rooms functions
async function loadAllRooms() {
    try {
        const response = await fetch('/api/rooms');
        allRooms = await response.json();
        displayAllRooms();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

function displayAllRooms() {
    const container = document.getElementById('rooms-list');
    if (!container) return;
    
    if (allRooms.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No rooms created yet.</p></div>';
        return;
    }

    container.innerHTML = allRooms.map(room => `
        <div class="reservation-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">Room ${room.room_number}</h4>
                    <p><strong>Type:</strong> ${room.room_type}</p>
                    <p><strong>Price:</strong> ${room.price_per_night}/night</p>
                    <p><strong>Status:</strong> <span class="status-badge ${room.room_status === 'Vacant' ? 'status-paid' : 'status-pending'}">${room.room_status}</span></p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="openEditRoomModal('${room.room_number}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteRoom('${room.room_number}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function setupRoomForm() {
    const form = document.getElementById('room-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            room_number: document.getElementById('room-number').value,
            room_status: document.getElementById('room-status').value,
            type_id: parseInt(document.getElementById('room-type-select').value)
        };

        try {
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Room created successfully!');
                e.target.reset();
                loadAllRooms();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating room');
        }
    });
}

function openEditRoomModal(roomNumber) {
    const room = allRooms.find(r => r.room_number === roomNumber);
    
    if (room) {
        document.getElementById('edit-room-number-hidden').value = room.room_number;
        document.getElementById('edit-room-number').value = room.room_number;
        document.getElementById('edit-room-type').value = room.type_id;
        document.getElementById('edit-room-status').value = room.room_status;
        document.getElementById('edit-room-modal').classList.add('active');
    }
}

function closeEditRoomModal() {
    document.getElementById('edit-room-modal').classList.remove('active');
}

async function deleteRoom(roomNumber) {
    if (!confirm('Are you sure you want to delete this room? This will fail if the room has any reservations.')) {
        return;
    }

    try {
        const response = await fetch(`/api/rooms/${roomNumber}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Room deleted successfully!');
            loadAllRooms();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting room');
    }
}

function setupRoomModals() {
    const editRoomTypeForm = document.getElementById('edit-roomtype-form');
    if (editRoomTypeForm) {
        editRoomTypeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const typeId = document.getElementById('edit-roomtype-id').value;
            const data = {
                name: document.getElementById('edit-roomtype-name').value,
                price_per_night: parseInt(document.getElementById('edit-roomtype-price').value)
            };

            try {
                const response = await fetch(`/api/roomtypes/${typeId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('Room type updated successfully!');
                    closeEditRoomTypeModal();
                    loadRoomTypes();
                } else {
                    alert('Error updating room type');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating room type');
            }
        });
    }

    const editRoomForm = document.getElementById('edit-room-form');
    if (editRoomForm) {
        editRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const roomNumber = document.getElementById('edit-room-number-hidden').value;
            const data = {
                room_status: document.getElementById('edit-room-status').value,
                type_id: parseInt(document.getElementById('edit-room-type').value)
            };

            try {
                const response = await fetch(`/api/rooms/${roomNumber}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('Room updated successfully!');
                    closeEditRoomModal();
                    loadAllRooms();
                } else {
                    alert('Error updating room');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating room');
            }
        });
    }
}

// Coupons functions
async function loadAllCoupons() {
    try {
        const response = await fetch('/api/coupons');
        allCoupons = await response.json();
        displayAllCoupons();
    } catch (error) {
        console.error('Error loading coupons:', error);
    }
}

function displayAllCoupons() {
    const container = document.getElementById('coupons-list');
    if (!container) return;
    
    if (allCoupons.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No coupons created yet.</p></div>';
        return;
    }

    container.innerHTML = allCoupons.map(coupon => {
        const isExpired = new Date(coupon.expired_date) < new Date();
        const isActive = !isExpired && coupon.qty > 0;
        
        return `
        <div class="reservation-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">${coupon.coupon_id}</h4>
                    <p><strong>Discount:</strong> ${coupon.discount_amt}% off</p>
                    <p><strong>Quantity Remaining:</strong> ${coupon.qty}</p>
                    <p><strong>Valid From:</strong> ${formatDate(coupon.start_date)}</p>
                    <p><strong>Expires:</strong> ${formatDate(coupon.expired_date)}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="openEditCouponModal('${coupon.coupon_id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteCoupon('${coupon.coupon_id}')">Delete</button>
                </div>
            </div>
        </div>
    `}).join('');
}

function setupCouponForm() {
    const form = document.getElementById('coupon-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            coupon_id: document.getElementById('coupon-id').value,
            discount_amt: parseInt(document.getElementById('coupon-discount').value),
            qty: parseInt(document.getElementById('coupon-qty').value),
            start_date: document.getElementById('coupon-start').value,
            expired_date: document.getElementById('coupon-expire').value
        };

        // Validate dates
        if (new Date(data.expired_date) <= new Date(data.start_date)) {
            alert('Expiry date must be after start date');
            return;
        }

        try {
            const response = await fetch('/api/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('Coupon created successfully!');
                e.target.reset();
                loadAllCoupons();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating coupon');
        }
    });
}

function openEditCouponModal(couponId) {
    const coupon = allCoupons.find(c => c.coupon_id === couponId);
    
    if (coupon) {
        document.getElementById('edit-coupon-id-hidden').value = coupon.coupon_id;
        document.getElementById('edit-coupon-id').value = coupon.coupon_id;
        document.getElementById('edit-coupon-discount').value = coupon.discount_amt;
        document.getElementById('edit-coupon-qty').value = coupon.qty;
        document.getElementById('edit-coupon-start').value = coupon.start_date;
        document.getElementById('edit-coupon-expire').value = coupon.expired_date;
        document.getElementById('edit-coupon-modal').classList.add('active');
    }
}

function closeEditCouponModal() {
    document.getElementById('edit-coupon-modal').classList.remove('active');
}

async function deleteCoupon(couponId) {
    if (!confirm('Are you sure you want to delete this coupon? This will fail if the coupon is used in any transactions.')) {
        return;
    }

    try {
        const response = await fetch(`/api/coupons/${couponId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Coupon deleted successfully!');
            loadAllCoupons();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting coupon');
    }
}

function setupCouponModal() {
    const editCouponForm = document.getElementById('edit-coupon-form');
    if (editCouponForm) {
        editCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const couponId = document.getElementById('edit-coupon-id-hidden').value;
            const data = {
                discount_amt: parseInt(document.getElementById('edit-coupon-discount').value),
                qty: parseInt(document.getElementById('edit-coupon-qty').value),
                start_date: document.getElementById('edit-coupon-start').value,
                expired_date: document.getElementById('edit-coupon-expire').value
            };

            try {
                const response = await fetch(`/api/coupons/${couponId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('Coupon updated successfully!');
                    closeEditCouponModal();
                    loadAllCoupons();
                } else {
                    alert('Error updating coupon');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating coupon');
            }
        });
    }
}