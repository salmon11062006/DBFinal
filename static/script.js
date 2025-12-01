// Global variables
let guests = [];
let rooms = [];
let coupons = [];
let reservations = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    // Initialize based on current page
    if (currentPage === '/reservations') {
        initReservationsPage();
    } else if (currentPage === '/guests') {
        initGuestsPage();
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

// Load guests
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