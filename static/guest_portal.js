// Global state
let currentGuest = null;
let availableRooms = [];
let selectedRoom = null;
let bookingDetails = {
    checkIn: null,
    checkOut: null,
    guests: 1,
    coupon: null,
    discount: 0
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupGuestInfoForm();
    setupLoginForm();
    setupBookingForm();
    setupPaymentForm();
    setupPaymentMethodToggle();
    setMinDate();
});

// Show/Hide sections
function showLogin() {
    document.getElementById('auth-selection').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' });
}

function showRegister() {
    document.getElementById('auth-selection').style.display = 'none';
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('guest-info-form').style.display = 'block';
    document.getElementById('register-section').scrollIntoView({ behavior: 'smooth' });
}

function backToAuthSelection() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('auth-selection').style.display = 'block';
    document.getElementById('auth-selection').scrollIntoView({ behavior: 'smooth' });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        location.reload();
    }
}

// Login Form
function setupLoginForm() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const phoneLast4 = document.getElementById('login-phone').value;
        
        console.log('Login attempt:', email);
        
        try {
            const response = await fetch('/api/guests/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email, 
                    phone_last4: phoneLast4 
                })
            });
            
            const result = await response.json();
            console.log('Login response:', result);
            
            if (response.ok && result.success) {
                // Login successful
                currentGuest = result.guest;
                
                // Display logged in info
                document.getElementById('logged-guest-name').textContent = currentGuest.name;
                document.getElementById('logged-guest-email').textContent = currentGuest.email;
                document.getElementById('logged-guest-phone').textContent = currentGuest.phone;
                
                // Show logged in section
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('logged-in-section').style.display = 'block';
                document.getElementById('logged-in-section').scrollIntoView({ behavior: 'smooth' });
                
                console.log('Logged in as:', currentGuest);
            } else {
                alert(result.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Login error. Please try again.');
        }
    });
}

// Set minimum date to today
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const checkinInput = document.getElementById('booking-checkin');
    const checkoutInput = document.getElementById('booking-checkout');
    if (checkinInput) checkinInput.min = today;
    if (checkoutInput) checkoutInput.min = today;
}

// Guest Information Form
function setupGuestInfoForm() {
    const form = document.getElementById('guest-info-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('guest-name').value,
            email: document.getElementById('guest-email').value,
            phone: document.getElementById('guest-phone').value
        };

        console.log('Submitting guest data:', data);
        console.log('Current guest:', currentGuest);

        try {
            let response;
            let isUpdate = false;
            
            // If guest exists, update; otherwise create new
            if (currentGuest && currentGuest.guest_id) {
                console.log('Updating existing guest:', currentGuest.guest_id);
                isUpdate = true;
                response = await fetch(`/api/guests/${currentGuest.guest_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                // Create new guest
                console.log('Creating new guest');
                response = await fetch('/api/guests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (response.ok) {
                if (!isUpdate) {
                    // New guest - save the guest_id
                    currentGuest = { ...data, guest_id: result.guest_id };
                    console.log('New guest created with ID:', result.guest_id);
                } else {
                    // Update existing guest data
                    currentGuest.name = data.name;
                    currentGuest.email = data.email;
                    currentGuest.phone = data.phone;
                    console.log('Guest updated');
                }
                
                // Display updated guest info
                document.getElementById('display-guest-name').textContent = data.name;
                document.getElementById('display-guest-email').textContent = data.email;
                document.getElementById('display-guest-phone').textContent = data.phone;
                
                document.getElementById('guest-info-form').style.display = 'none';
                document.getElementById('guest-info-display').style.display = 'block';
                
                if (isUpdate) {
                    alert('Information updated successfully!');
                }
            } else {
                console.error('Error response:', result);
                alert('Error: ' + (result.error || 'Please try again.'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error saving information: ' + error.message);
        }
    });
}

function editGuestInfo() {
    // Pre-fill the form with current guest data
    document.getElementById('guest-name').value = currentGuest.name;
    document.getElementById('guest-email').value = currentGuest.email;
    document.getElementById('guest-phone').value = currentGuest.phone;
    
    // Show form, hide display
    document.getElementById('guest-info-form').style.display = 'block';
    document.getElementById('guest-info-display').style.display = 'none';
    
    // Scroll to form
    document.getElementById('guest-info-form').scrollIntoView({ behavior: 'smooth' });
}

function showBookingForm() {
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('logged-in-section').style.display = 'none';
    document.getElementById('my-bookings-section').style.display = 'none';
    document.getElementById('room-selection-section').style.display = 'block';
    loadAvailableRooms();
    
    // Scroll to room selection
    document.getElementById('room-selection-section').scrollIntoView({ behavior: 'smooth' });
}

function backToLoggedIn() {
    document.getElementById('my-bookings-section').style.display = 'none';
    document.getElementById('logged-in-section').style.display = 'block';
    document.getElementById('logged-in-section').scrollIntoView({ behavior: 'smooth' });
}

// View My Bookings
async function viewMyBookings() {
    if (!currentGuest || !currentGuest.guest_id) {
        alert('Please login first');
        return;
    }
    
    console.log('Loading bookings for guest:', currentGuest.guest_id);
    
    try {
        const response = await fetch(`/api/guests/${currentGuest.guest_id}/reservations`);
        const bookings = await response.json();
        
        console.log('Bookings loaded:', bookings);
        
        const container = document.getElementById('my-bookings-list');
        
        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="info-card" style="text-align: center;">
                    <h3>No Bookings Found</h3>
                    <p>You haven't made any reservations yet.</p>
                    <button class="btn btn-primary" onclick="showBookingForm()" style="margin-top: 20px;">Make Your First Booking</button>
                </div>
            `;
        } else {
            container.innerHTML = bookings.map(booking => {
                const checkInDate = new Date(booking.check_in_date);
                const today = new Date();
                const isPast = checkInDate < today;
                const canCancel = !isPast;
                
                return `
                <div class="reservation-card" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div style="flex: 1;">
                            <h4 style="color: #667eea; margin-bottom: 10px;">Booking #${booking.reservation_id}</h4>
                            <p><strong>Room:</strong> ${booking.room_type} - Room ${booking.room_number}</p>
                            <p><strong>Check-in:</strong> ${formatDate(booking.check_in_date)}</p>
                            <p><strong>Check-out:</strong> ${formatDate(booking.check_out_date)}</p>
                            <p><strong>Guests:</strong> ${booking.number_of_guests}</p>
                            <p><strong>Total Amount:</strong> ${booking.transaction_amt}</p>
                            <p><strong>Payment:</strong> ${booking.pay_method} - 
                                <span class="status-badge ${booking.pay_status === 'Paid' ? 'status-paid' : 'status-pending'}">
                                    ${booking.pay_status}
                                </span>
                            </p>
                            ${isPast ? '<p style="color: #999; margin-top: 10px;">✓ Completed</p>' : '<p style="color: #28a745; margin-top: 10px;">📅 Upcoming</p>'}
                        </div>
                        <div>
                            ${canCancel ? `<button class="btn btn-danger" onclick="cancelBooking(${booking.reservation_id})">Cancel Booking</button>` : ''}
                        </div>
                    </div>
                </div>
            `}).join('');
        }
        
        document.getElementById('logged-in-section').style.display = 'none';
        document.getElementById('my-bookings-section').style.display = 'block';
        document.getElementById('my-bookings-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        alert('Error loading your bookings. Please try again.');
    }
}

// Cancel Booking
async function cancelBooking(reservationId) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return;
    }
    
    console.log('Cancelling reservation:', reservationId);
    
    try {
        const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Booking cancelled successfully!');
            viewMyBookings(); // Reload bookings
        } else {
            alert('Error: ' + (result.error || 'Could not cancel booking'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error cancelling booking. Please try again.');
    }
}

// Load available rooms
async function loadAvailableRooms() {
    try {
        const response = await fetch('/api/rooms/available');
        availableRooms = await response.json();
        displayAvailableRooms();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

function displayAvailableRooms() {
    const container = document.getElementById('available-rooms-list');
    
    if (availableRooms.length === 0) {
        container.innerHTML = '<p>No rooms available at the moment. Please check back later.</p>';
        return;
    }

    container.innerHTML = availableRooms.map(room => `
        <div class="room-card" onclick="selectRoom('${room.room_number}')">
            <h3>${room.room_type} - Room ${room.room_number}</h3>
            <p class="room-price">$${room.price_per_night} / night</p>
            <p class="room-features">Perfect for a comfortable stay with all amenities</p>
            <button class="btn btn-primary">Select This Room</button>
        </div>
    `).join('');
}

function selectRoom(roomNumber) {
    selectedRoom = availableRooms.find(r => r.room_number === roomNumber);
    
    // Update selected room info
    document.getElementById('selected-room-info').innerHTML = `
        <h4>${selectedRoom.room_type} - Room ${selectedRoom.room_number}</h4>
        <p><strong>Rate:</strong> $${selectedRoom.price_per_night} per night</p>
    `;
    
    // Show booking details section
    document.getElementById('booking-details-section').style.display = 'block';
    document.getElementById('booking-details-section').scrollIntoView({ behavior: 'smooth' });
}

function backToRoomSelection() {
    document.getElementById('booking-details-section').style.display = 'none';
    document.getElementById('room-selection-section').scrollIntoView({ behavior: 'smooth' });
}

// Booking Form
function setupBookingForm() {
    const form = document.getElementById('booking-form');
    const checkinInput = document.getElementById('booking-checkin');
    const checkoutInput = document.getElementById('booking-checkout');
    const guestsInput = document.getElementById('booking-guests');
    
    // Update price when dates change
    [checkinInput, checkoutInput, guestsInput].forEach(input => {
        input.addEventListener('change', calculatePrice);
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        bookingDetails.checkIn = checkinInput.value;
        bookingDetails.checkOut = checkoutInput.value;
        bookingDetails.guests = parseInt(guestsInput.value);
        
        if (new Date(bookingDetails.checkOut) <= new Date(bookingDetails.checkIn)) {
            alert('Check-out date must be after check-in date');
            return;
        }
        
        showPaymentSection();
    });
}

function calculatePrice() {
    const checkin = document.getElementById('booking-checkin').value;
    const checkout = document.getElementById('booking-checkout').value;
    
    if (!checkin || !checkout || !selectedRoom) return;
    
    const nights = Math.max(1, (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const roomRate = selectedRoom.price_per_night;
    const subtotal = roomRate * nights;
    const discount = bookingDetails.discount || 0;
    const discountAmount = Math.floor(subtotal * discount / 100);
    const total = subtotal - discountAmount;
    
    // Display price summary
    document.getElementById('room-rate').textContent = roomRate;
    document.getElementById('num-nights').textContent = nights;
    document.getElementById('subtotal').textContent = subtotal;
    document.getElementById('total-price').textContent = total;
    
    if (discount > 0) {
        document.getElementById('discount-amount').textContent = discountAmount;
        document.getElementById('discount-percent').textContent = discount;
        document.getElementById('discount-line').style.display = 'block';
    } else {
        document.getElementById('discount-line').style.display = 'none';
    }
    
    document.getElementById('price-summary').style.display = 'block';
}

async function applyCoupon() {
    const couponCode = document.getElementById('booking-coupon').value.trim();
    
    if (!couponCode) {
        alert('Please enter a coupon code');
        return;
    }
    
    try {
        const response = await fetch(`/api/coupons`);
        const coupons = await response.json();
        const coupon = coupons.find(c => c.coupon_id === couponCode && c.qty > 0);
        
        if (coupon) {
            const today = new Date().toISOString().split('T')[0];
            if (coupon.start_date <= today && coupon.expired_date >= today) {
                bookingDetails.coupon = coupon.coupon_id;
                bookingDetails.discount = coupon.discount_amt;
                alert(`Coupon applied! You get ${coupon.discount_amt}% off`);
                calculatePrice();
            } else {
                alert('This coupon has expired');
            }
        } else {
            alert('Invalid or expired coupon code');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error applying coupon');
    }
}

function showPaymentSection() {
    // Calculate final amounts
    const checkin = new Date(bookingDetails.checkIn);
    const checkout = new Date(bookingDetails.checkOut);
    const nights = Math.max(1, (checkout - checkin) / (1000 * 60 * 60 * 24));
    const roomRate = selectedRoom.price_per_night;
    const subtotal = roomRate * nights;
    const discount = bookingDetails.discount || 0;
    const discountAmount = Math.floor(subtotal * discount / 100);
    const total = subtotal - discountAmount;
    
    // Display booking summary
    let summaryHTML = `
        <h3>Booking Summary</h3>
        <p><strong>Guest:</strong> ${currentGuest.name}</p>
        <p><strong>Room:</strong> ${selectedRoom.room_type} - Room ${selectedRoom.room_number}</p>
        <p><strong>Check-in:</strong> ${formatDate(bookingDetails.checkIn)}</p>
        <p><strong>Check-out:</strong> ${formatDate(bookingDetails.checkOut)}</p>
        <p><strong>Guests:</strong> ${bookingDetails.guests}</p>
        <p><strong>Nights:</strong> ${nights}</p>
        <p><strong>Room Rate:</strong> $${roomRate} / night</p>
        <p><strong>Subtotal:</strong> $${subtotal}</p>
    `;
    
    if (discount > 0) {
        summaryHTML += `<p style="color: #28a745;"><strong>Discount (${discount}%):</strong> -$${discountAmount}</p>`;
    }
    
    summaryHTML += `<p class="summary-total">Total: $${total}</p>`;
    
    document.getElementById('booking-summary').innerHTML = summaryHTML;
    document.getElementById('payment-section').style.display = 'block';
    document.getElementById('payment-section').scrollIntoView({ behavior: 'smooth' });
}

function backToBooking() {
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('booking-details-section').scrollIntoView({ behavior: 'smooth' });
}

// Payment Method Toggle
function setupPaymentMethodToggle() {
    const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', (e) => {
            const cardDetails = document.getElementById('card-details');
            if (e.target.value === 'Cash') {
                cardDetails.style.display = 'none';
            } else {
                cardDetails.style.display = 'block';
            }
        });
    });
}

// Payment Form
function setupPaymentForm() {
    const form = document.getElementById('payment-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
        
        // Create reservation
        const reservationData = {
            guest_id: currentGuest.guest_id,
            room_number: selectedRoom.room_number,
            check_in_date: bookingDetails.checkIn,
            check_out_date: bookingDetails.checkOut,
            number_of_guests: bookingDetails.guests,
            pay_method: paymentMethod,
            coupon_id: bookingDetails.coupon || null
        };
        
        try {
            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservationData)
            });

            if (response.ok) {
                const result = await response.json();
                showConfirmation(result.reservation_id);
            } else {
                const error = await response.json();
                alert('Error creating reservation: ' + error.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error creating reservation. Please try again.');
        }
    });
}

function showConfirmation(reservationId) {
    const checkin = new Date(bookingDetails.checkIn);
    const checkout = new Date(bookingDetails.checkOut);
    const nights = Math.max(1, (checkout - checkin) / (1000 * 60 * 60 * 24));
    const roomRate = selectedRoom.price_per_night;
    const subtotal = roomRate * nights;
    const discount = bookingDetails.discount || 0;
    const discountAmount = Math.floor(subtotal * discount / 100);
    const total = subtotal - discountAmount;
    
    const confirmationHTML = `
        <p><strong>Reservation ID:</strong> #${reservationId}</p>
        <p><strong>Guest:</strong> ${currentGuest.name}</p>
        <p><strong>Email:</strong> ${currentGuest.email}</p>
        <p><strong>Room:</strong> ${selectedRoom.room_type} - Room ${selectedRoom.room_number}</p>
        <p><strong>Check-in:</strong> ${formatDate(bookingDetails.checkIn)}</p>
        <p><strong>Check-out:</strong> ${formatDate(bookingDetails.checkOut)}</p>
        <p><strong>Total Paid:</strong> $${total}</p>
        <p style="margin-top: 20px; color: #666;">A confirmation email has been sent to ${currentGuest.email}</p>
    `;
    
    document.getElementById('confirmation-details').innerHTML = confirmationHTML;
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('confirmation-section').style.display = 'block';
    document.getElementById('confirmation-section').scrollIntoView({ behavior: 'smooth' });
}

// Utility function
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}