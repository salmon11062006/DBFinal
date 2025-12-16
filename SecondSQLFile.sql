USE hotelreservation;

-- Insert Guests
INSERT INTO Guest (name, email, phone, password) VALUES 
('Alice Doe', 'alice@gmail.com', '0812345678', '(hashed_pwd)'),
('Bob Smith', 'bob@gmail.com', '0823456789', '(hashed_pwd)'),
('Claire Lee', 'claire@gmail.com', '0834567890', '(hashed_pwd)'),
('David Brown', 'david@gmail.com', '0899876543', '(hashed_pwd)');

-- Insert Room Types
INSERT INTO Room_Type (name, price_per_night) VALUES 
('Deluxe', 200.00),
('Suite', 300.00),
('Standard', 150.00);

-- Insert Coupons
INSERT INTO Coupon (coupon_id, discount_amount, qty, start_date, expired_date) VALUES 
('C001', 0.10, 5, '2025-12-01', '2025-12-31'),
('C002', 0.15, 3, '2025-12-15', '2025-12-25');

-- Insert Add-on Services
INSERT INTO Addon_Services (service_name, service_cost) VALUES 
('Breakfast', 20.00),
('Spa', 50.00),
('Extra bed', 30.00);

-- Insert Rooms
INSERT INTO Room (room_number, type_id, room_status) VALUES 
(101, 1, 'Available'),
(201, 2, 'Available'),
(102, 3, 'Available');

-- Insert Reservations
-- Note: Using NULL for 'NONE' coupon to maintain referential integrity if 'NONE' isn't in Coupon table
INSERT INTO Reservation (guest_id, room_number, coupon_id, check_in_date, check_out_date, total_cost, pay_method, reservation_status, number_of_guests) VALUES 
(1, 101, 'C001', '2025-12-21', '2025-12-23', 243.00, 'Credit Card', 'Confirmed', 2),
(2, 201, 'C002', '2025-12-22', '2025-12-24', 297.50, 'PayPal', 'Checked-Out', 3),
(3, 102, NULL, '2025-12-20', '2025-12-23', 200.00, 'Cash', 'Cancelled', 1),
(4, 101, NULL, '2025-12-25', '2025-12-28', 230.00, 'Credit Card', 'Confirmed', 1);

-- Insert Reservation Add-ons
INSERT INTO Reservation_Addon (reservation_id, addon_id) VALUES 
(1, 1),
(1, 2),
(2, 1),
(2, 3),
(3, 2),
(4, 3);

select * FROM guest;
select * FROM Reservation;
select * FROM room_type;
select * FROM room;
select * FROM Reservation_AddOn;
select * FROM Addon_Services;
select * FROM coupon;