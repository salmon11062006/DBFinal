CREATE DATABASE hotelreservation;
USE hotelreservation;

CREATE TABLE Guest (
    guest_id int PRIMARY KEY auto_increment,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    password VARCHAR(255)
);

CREATE TABLE Room_Type (
    type_id int PRIMARY KEY auto_increment,
    name VARCHAR(50),
    price_per_night DECIMAL(10, 2)
);

CREATE TABLE Coupon (
    coupon_id VARCHAR(10) PRIMARY KEY,
    discount_amount DECIMAL(4, 2), -- e.g. 0.10 for 10%
    qty INT,
    start_date DATE,
    expired_date DATE
);

CREATE TABLE Addon_Services (
    addon_id int PRIMARY KEY auto_increment,
    service_name VARCHAR(100),
    service_cost DECIMAL(10, 2)
);

CREATE TABLE Room (
    room_number INT PRIMARY KEY,
    type_id int,
    room_status VARCHAR(20),
    FOREIGN KEY (type_id) REFERENCES Room_Type(type_id)
);

CREATE TABLE Reservation (
    reservation_id INT PRIMARY KEY auto_increment,
    guest_id int,
    room_number INT,
    coupon_id VARCHAR(10),
    check_in_date DATE,
    check_out_date DATE,
    total_cost DECIMAL(10, 2),
    pay_method VARCHAR(50),
    reservation_status VARCHAR(20),
    number_of_guests INT,
    FOREIGN KEY (guest_id) REFERENCES Guest(guest_id),
    FOREIGN KEY (room_number) REFERENCES Room(room_number),
    -- Coupon ID can be NULL or 'NONE', so we handle strictly or allow nulls
    FOREIGN KEY (coupon_id) REFERENCES Coupon(coupon_id) 
);

CREATE TABLE Reservation_Addon (
    reservation_id INT,
    addon_id int,
    PRIMARY KEY (reservation_id, addon_id),
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id),
    FOREIGN KEY (addon_id) REFERENCES Addon_Services(addon_id)
);