let guests = [];
let rooms = [];
let coupons = [];
let reservations = [];

document.addEventListener('DOMContentLoaded', () => {
    loadGuests();
    loadRooms();
    loadCoupons();
    loadReservations();
    setupForms();
});

async function loadGuests() {
    try {
        const response = await fetch('/api/guests');
        guests = await response.json();

        const guestSelect = document.getElementById('guest-select');
        if (guestSelect) {
            guestSelect.innerHTML = '<option value="">-- Select Guest --</option>';
        }

        guests.forEach(guest => {
            const option = document.createElement('option');
            option.value = guest.id;
            option.textContent = `${guest.name} (${guest.email})`;
            guestSelect.appendChild(option);
        });

        displayGuests();
    } catch (error) {
        console.error('Error loading guests:', error);
    }
}

function displayGuests() {
    const container = document.getElementById('guest-list');

    if (guests.length === 0) {
        container.innerHTML = '<p>No guests found.</p>';
        return;
    }

    container.innerHTML = guests.map(guest => `
            <h3>${guest.name}</h3>
            <p><strong>Email:</strong> ${guest.email}</p>
            <p><strong>Phone:</strong> ${guest.phone}</p>
    `).join('');
}



function setupForms() {
    // Guest registration form
    const guestForm = document.getElementById('guest-form');
    if (guestForm) {
        guestForm.addEventListener('submit', async (e) => {
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
    

    // Reservation form
    const reservationForm = document.getElementById('reservation-form');

    if (guestForm) {
        reservationForm.addEventListener('submit', async (e) => {
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
    

    // Edit form
    const editForm = document.getElementById('edit-form');

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
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

    
}