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
        const response = await fetch('/view/guests');
        guests = await response.json();

        const guestSelect = document.getElementById('guest-select');
        guestSelect.innerHTML = '<option value="">-- Select Guest --</option>';

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