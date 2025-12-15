// Global state
let currentGuest = null;
let selectedRoom = null;
let availableAddons = [];
let selectedAddons = [];
let bookingData = {
    coupon: null,
    discount: 0
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupForms();
    setMinDates();
});

function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    const checkin = document.getElementById('checkin-date');
    const checkout = document.getElementById('checkout-date');
    const editCheckin = document.getElementById('edit-checkin');
    const editCheckout = document.getElementById('edit-checkout');
    
    if (checkin) checkin.min = today;
    if (checkout) checkout.min = today;
    if (editCheckin) editCheckin.min = today;
    if (editCheckout) editCheckout.min = today;
}

// ========== NAVIGATION ==========
function showLogin() {
    hideAll();
    document.getElementById('login-section').style.display = 'block';
}

function showRegister() {
    hideAll();
    document.getElementById('register-section').style.display = 'block';
}

function backToAuth() {
    hideAll();
    document.getElementById('auth-selection').style.display = 'block';
}

function backToDashboard() {
    hideAll();
    document.getElementById('dashboard-section').style.display = 'block';
}

function startBooking() {
    hideAll();
    document.getElementById('rooms-section').style.display = 'block';
    loadRooms();
}

function backToRooms() {
    hideAll();
    document.getElementById('rooms-section').style.display = 'block';
}

function backToDetails() {
    hideAll();
    document.getElementById('booking-details-section').style.display = 'block';
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        location.reload();
    }
}

function hideAll() {
    document.querySelectorAll('.booking-section').forEach(section => {
        section.style.display = 'none';
    });
}

// ========== FORMS SETUP ==========
function setupForms() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/api/guests/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            if (response.ok && result.success) {
                currentGuest = result.guest;
                showDashboard();
                e.target.reset();
            } else {
                alert(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Login error. Please try again.');
        }
    });
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            phone: document.getElementById('reg-phone').value,
            password: document.getElementById('reg-password').value
        };
        
        try {
            const response = await fetch('/api/guests/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (response.ok) {
                alert('Registration successful! Please login.');
                showLogin();
                e.target.reset();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Registration error. Please try again.');
        }
    });
    
    // Booking form
    document.getElementById('booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;
        
        if (new Date(checkout) <= new Date(checkin)) {
            alert('Check-out must be after check-in');
            return;
        }
        
        showPaymentSection();
    });
    
    // Payment form
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const reservationData = {
            guest_id: currentGuest.guest_id,
            room_number: selectedRoom.room_number,
            check_in_date: document.getElementById('checkin-date').value,
            check_out_date: document.getElementById('checkout-date').value,
            number_of_guests: parseInt(document.getElementById('num-guests').value),
            pay_method: paymentMethod,
            addon_ids: selectedAddons,
            coupon_id: bookingData.coupon
        };
        
        try {
            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservationData)
            });
            
            const result = await response.json();
            if (response.ok) {
                showConfirmation(result);
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Booking error. Please try again.');
        }
    });
    
    // Edit profile form
    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('edit-password').value;
        const data = {
            name: document.getElementById('edit-name').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            password: password || currentGuest.password || 'unchanged'
        };
        
        try {
            const response = await fetch(`/api/guests/${currentGuest.guest_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                currentGuest.name = data.name;
                currentGuest.email = data.email;
                currentGuest.phone = data.phone;
                showDashboard();
                closeEditProfileModal();
                alert('Profile updated successfully!');
            } else {
                alert('Error updating profile');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Update error. Please try again.');
        }
    });
    
    // Edit booking form
    document.getElementById('edit-booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const resId = document.getElementById('edit-res-id').value;
        const data = {
            check_in_date: document.getElementById('edit-checkin').value,
            check_out_date: document.getElementById('edit-checkout').value,
            number_of_guests: parseInt(document.getElementById('edit-guests').value)
        };
        
        try {
            const response = await fetch(`/api/reservations/${resId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeEditBookingModal();
                viewMyBookings();
                alert('Reservation updated!');
            } else {
                alert('Error updating reservation');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Update error');
        }
    });
    
    // Date change listeners
    const checkinInput = document.getElementById('checkin-date');
    const checkoutInput = document.getElementById('checkout-date');
    
    if (checkinInput) {
        checkinInput.addEventListener('change', () => {
            console.log('Check-in date changed:', checkinInput.value);
            calculatePrice();
        });
    }
    
    if (checkoutInput) {
        checkoutInput.addEventListener('change', () => {
            console.log('Check-out date changed:', checkoutInput.value);
            calculatePrice();
        });
    }
}

// ========== DASHBOARD ==========
function showDashboard() {
    hideAll();
    document.getElementById('dash-name').textContent = currentGuest.name;
    document.getElementById('dash-email').textContent = currentGuest.email;
    document.getElementById('dash-phone').textContent = currentGuest.phone;
    document.getElementById('dashboard-section').style.display = 'block';
}

// ========== LOAD ROOMS ==========
async function loadRooms() {
    try {
        const response = await fetch('/api/rooms/available');
        const rooms = await response.json();
        
        const container = document.getElementById('rooms-list');
        if (rooms.length === 0) {
            container.innerHTML = '<p>No rooms available at the moment.</p>';
            return;
        }
        
        container.innerHTML = rooms.map(room => `
            <div class="room-card" onclick='selectRoom(${JSON.stringify(room)})'>
                <h3>${room.room_type} - Room ${room.room_number}</h3>
                <p class="room-price">$${room.price_per_night} / night</p>
                <button class="btn btn-primary">Select This Room</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

async function selectRoom(room) {
    selectedRoom = room;
    selectedAddons = []; // Reset selected addons
    bookingData = { coupon: null, discount: 0 }; // Reset booking data
    
    console.log('Room selected:', room);
    
    // Load addons
    try {
        const response = await fetch('/api/addons');
        availableAddons = await response.json();
        console.log('Addons loaded:', availableAddons);
    } catch (error) {
        console.error('Error loading addons:', error);
    }
    
    // Show booking details
    document.getElementById('selected-room-info').innerHTML = `
        <h4>${selectedRoom.room_type} - Room ${selectedRoom.room_number}</h4>
        <p><strong>Rate:</strong> ${selectedRoom.price_per_night} per night</p>
    `;
    
    // Display addons
    const addonsContainer = document.getElementById('addons-list');
    addonsContainer.innerHTML = availableAddons.map(addon => `
        <label class="addon-item">
            <input type="checkbox" value="${addon.addon_id}" onchange="toggleAddon(${addon.addon_id})">
            <span>${addon.service_name} - ${addon.service_cost}</span>
        </label>
    `).join('');
    
    // Clear form fields
    document.getElementById('checkin-date').value = '';
    document.getElementById('checkout-date').value = '';
    document.getElementById('num-guests').value = 1;
    document.getElementById('coupon-code').value = '';
    document.getElementById('price-summary').style.display = 'none';
    
    hideAll();
    document.getElementById('booking-details-section').style.display = 'block';
    
    console.log('Booking details section shown');
}

function toggleAddon(addonId) {
    console.log('Toggling addon:', addonId);
    const index = selectedAddons.indexOf(addonId);
    if (index > -1) {
        selectedAddons.splice(index, 1);
        console.log('Removed addon:', addonId);
    } else {
        selectedAddons.push(addonId);
        console.log('Added addon:', addonId);
    }
    console.log('Selected addons:', selectedAddons);
    calculatePrice();
}

// ========== PRICE CALCULATION ==========
function calculatePrice() {
    const checkin = document.getElementById('checkin-date').value;
    const checkout = document.getElementById('checkout-date').value;
    
    console.log('Calculating price...', { checkin, checkout, selectedRoom });
    
    if (!checkin || !checkout || !selectedRoom) {
        console.log('Missing data for calculation');
        return;
    }
    
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const nights = Math.max(1, Math.floor((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)));
    
    console.log('Nights:', nights);
    
    const roomRate = parseFloat(selectedRoom.price_per_night);
    const roomSubtotal = roomRate * nights;
    
    console.log('Room rate:', roomRate, 'Subtotal:', roomSubtotal);
    
    // Calculate addons cost
    let addonsCost = 0;
    selectedAddons.forEach(id => {
        const addon = availableAddons.find(a => a.addon_id === id);
        if (addon) {
            addonsCost += parseFloat(addon.service_cost);
            console.log('Adding addon:', addon.service_name, addon.service_cost);
        }
    });
    
    console.log('Total addons cost:', addonsCost);
    
    let total = roomSubtotal + addonsCost;
    
    // Apply discount
    const discount = bookingData.discount || 0;
    const discountAmt = total * discount;
    total -= discountAmt;
    
    console.log('Discount:', discount, 'Discount amount:', discountAmt, 'Final total:', total);
    
    // Display
    document.getElementById('room-rate').textContent = roomRate.toFixed(2);
    document.getElementById('nights').textContent = nights;
    document.getElementById('room-subtotal').textContent = roomSubtotal.toFixed(2);
    document.getElementById('addons-cost').textContent = addonsCost.toFixed(2);
    document.getElementById('discount-amt').textContent = discountAmt.toFixed(2);
    document.getElementById('discount-pct').textContent = (discount * 100).toFixed(0);
    document.getElementById('total-cost').textContent = total.toFixed(2);
    
    document.getElementById('addons-cost-line').style.display = addonsCost > 0 ? 'block' : 'none';
    document.getElementById('discount-line').style.display = discount > 0 ? 'block' : 'none';
    document.getElementById('price-summary').style.display = 'block';
    
    console.log('Price display updated');
}

async function applyCoupon() {
    const code = document.getElementById('coupon-code').value.trim();
    if (!code) return;
    
    try {
        const response = await fetch('/api/coupons');
        const coupons = await response.json();
        const coupon = coupons.find(c => c.coupon_id === code);
        
        if (coupon) {
            bookingData.coupon = coupon.coupon_id;
            bookingData.discount = parseFloat(coupon.discount_amount);
            alert(`Coupon applied! ${(bookingData.discount * 100).toFixed(0)}% off`);
            calculatePrice();
        } else {
            alert('Invalid coupon code');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error applying coupon');
    }
}

// ========== PAYMENT & CONFIRMATION ==========
function showPaymentSection() {
    const total = document.getElementById('total-cost').textContent;
    const addonsText = selectedAddons.length > 0 
        ? availableAddons.filter(a => selectedAddons.includes(a.addon_id)).map(a => a.service_name).join(', ')
        : 'None';
    
    document.getElementById('payment-summary').innerHTML = `
        <h3>Booking Summary</h3>
        <p><strong>Room:</strong> ${selectedRoom.room_type} - Room ${selectedRoom.room_number}</p>
        <p><strong>Check-in:</strong> ${document.getElementById('checkin-date').value}</p>
        <p><strong>Check-out:</strong> ${document.getElementById('checkout-date').value}</p>
        <p><strong>Guests:</strong> ${document.getElementById('num-guests').value}</p>
        <p><strong>Add-ons:</strong> ${addonsText}</p>
        <p class="summary-total">Total: $${total}</p>
    `;
    
    hideAll();
    document.getElementById('payment-section').style.display = 'block';
}

function showConfirmation(result) {
    document.getElementById('confirmation-details').innerHTML = `
        <p><strong>Reservation ID:</strong> #${result.reservation_id}</p>
        <p><strong>Total Paid:</strong> $${result.total_cost}</p>
        <p style="margin-top: 20px; color: #28a745;">Your booking has been confirmed!</p>
    `;
    
    hideAll();
    document.getElementById('confirmation-section').style.display = 'block';
}

// ========== MY BOOKINGS ==========
async function viewMyBookings() {
    try {
        const response = await fetch(`/api/guests/${currentGuest.guest_id}/reservations`);
        const bookings = await response.json();
        
        const container = document.getElementById('bookings-list');
        if (bookings.length === 0) {
            container.innerHTML = '<p>No bookings found.</p>';
        } else {
            container.innerHTML = bookings.map(booking => {
                const isPast = new Date(booking.check_in_date) < new Date();
                const canEdit = !isPast && booking.reservation_status === 'Confirmed';
                const addonsText = booking.addons.length > 0 
                    ? booking.addons.map(a => a.service_name).join(', ')
                    : 'None';
                
                return `
                <div class="reservation-card">
                    <h4>Booking #${booking.reservation_id} - ${booking.reservation_status}</h4>
                    <p><strong>Room:</strong> ${booking.room_type} - Room ${booking.room_number}</p>
                    <p><strong>Check-in:</strong> ${booking.check_in_date}</p>
                    <p><strong>Check-out:</strong> ${booking.check_out_date}</p>
                    <p><strong>Guests:</strong> ${booking.number_of_guests}</p>
                    <p><strong>Add-ons:</strong> ${addonsText}</p>
                    <p><strong>Total:</strong> $${booking.total_cost}</p>
                    <p><strong>Payment:</strong> ${booking.pay_method}</p>
                    ${canEdit ? `
                        <div style="margin-top: 10px;">
                            <button class="btn btn-secondary" onclick='editBooking(${JSON.stringify(booking)})'>Edit</button>
                            <button class="btn btn-danger" onclick="cancelBooking(${booking.reservation_id})">Cancel</button>
                        </div>
                    ` : ''}
                </div>
            `}).join('');
        }
        
        hideAll();
        document.getElementById('bookings-section').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading bookings');
    }
}

function editBooking(booking) {
    document.getElementById('edit-res-id').value = booking.reservation_id;
    document.getElementById('edit-checkin').value = booking.check_in_date;
    document.getElementById('edit-checkout').value = booking.check_out_date;
    document.getElementById('edit-guests').value = booking.number_of_guests;
    document.getElementById('edit-booking-modal').classList.add('active');
}

async function cancelBooking(reservationId) {
    if (!confirm('Cancel this booking?')) return;
    
    try {
        const response = await fetch(`/api/reservations/${reservationId}/cancel`, { method: 'DELETE' });
        if (response.ok) {
            alert('Booking cancelled');
            viewMyBookings();
        } else {
            alert('Error cancelling booking');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Cancellation error');
    }
}

// ========== MODALS ==========
function openEditProfileModal() {
    document.getElementById('edit-name').value = currentGuest.name;
    document.getElementById('edit-email').value = currentGuest.email;
    document.getElementById('edit-phone').value = currentGuest.phone;
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
}

function closeEditBookingModal() {
    document.getElementById('edit-booking-modal').classList.remove('active');
}