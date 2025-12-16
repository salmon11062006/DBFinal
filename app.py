from flask import Flask, render_template, request, jsonify
import mysql.connector
from datetime import datetime

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',  # Change this
    'database': 'hotelreservation'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# Routes
@app.route('/')
def index():
    return render_template('guest_portal.html')

# ========== GUEST APIs ==========

# Guest Registration
@app.route('/api/guests/register', methods=['POST'])
def register_guest():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO Guest (name, email, phone, password) VALUES (%s, %s, %s, %s)',
            (data['name'], data['email'], data['phone'], data['password'])
        )
        conn.commit()
        guest_id = cursor.lastrowid
        return jsonify({'guest_id': guest_id, 'message': 'Guest registered successfully'}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error registering guest: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Guest Login
@app.route('/api/guests/login', methods=['POST'])
def guest_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Guest WHERE email = %s AND password = %s', (email, password))
        guest = cursor.fetchone()
        
        if guest:
            return jsonify({
                'success': True,
                'guest': {
                    'guest_id': guest['guest_id'],
                    'name': guest['name'],
                    'email': guest['email'],
                    'phone': guest['phone']
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
    except Exception as e:
        print(f"Error during login: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Update Guest Information
@app.route('/api/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE Guest 
            SET name = %s, email = %s, phone = %s, password = %s
            WHERE guest_id = %s
        ''', (data['name'], data['email'], data['phone'], data['password'], guest_id))
        conn.commit()
        return jsonify({'message': 'Guest information updated successfully'})
    except Exception as e:
        conn.rollback()
        print(f"Error updating guest: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Delete Guest Account
@app.route('/api/guests/<int:guest_id>', methods=['DELETE'])
def delete_guest(guest_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if guest has any reservations
        cursor.execute('SELECT COUNT(*) as count FROM Reservation WHERE guest_id = %s', (guest_id,))
        result = cursor.fetchone()
        
        if result['count'] > 0:
            return jsonify({
                'error': 'Cannot delete account. Please cancel all your bookings before deleting your account.'
            }), 400
        
        # Delete the guest if no reservations exist
        cursor.execute('DELETE FROM Guest WHERE guest_id = %s', (guest_id,))
        conn.commit()
        return jsonify({'message': 'Account deleted successfully'}), 200
    
    except Exception as e:
        conn.rollback()
        print(f"Error deleting guest: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ========== ROOM APIs ==========

# Get Available Rooms
@app.route('/api/rooms/available', methods=['GET'])
def get_available_rooms():
    check_in = request.args.get('check_in_date')
    check_out = request.args.get('check_out_date')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # If dates provided, check date availability
        if check_in and check_out:
            cursor.execute('''
                SELECT DISTINCT r.room_number, r.room_status, rt.name as room_type, rt.price_per_night, rt.type_id
                FROM Room r
                JOIN Room_Type rt ON r.type_id = rt.type_id
                WHERE r.room_number NOT IN (
                    SELECT room_number 
                    FROM Reservation 
                    WHERE reservation_status IN ('Confirmed', 'Checked-In')
                    AND (
                        (check_in_date <= %s AND check_out_date > %s) OR
                        (check_in_date < %s AND check_out_date >= %s) OR
                        (check_in_date >= %s AND check_out_date <= %s)
                    )
                )
                ORDER BY r.room_number
            ''', (check_in, check_in, check_out, check_out, check_in, check_out))
        else:
            # If no dates, show all rooms
            cursor.execute('''
                SELECT r.room_number, r.room_status, rt.name as room_type, rt.price_per_night, rt.type_id
                FROM Room r
                JOIN Room_Type rt ON r.type_id = rt.type_id
                ORDER BY r.room_number
            ''')
        
        rooms = cursor.fetchall()
        return jsonify(rooms)
    except Exception as e:
        print(f"Error fetching available rooms: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# ========== ADDON SERVICES APIs ==========

# Get All Addon Services
@app.route('/api/addons', methods=['GET'])
def get_addons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Addon_Services')
        addons = cursor.fetchall()
        return jsonify(addons)
    except Exception as e:
        print(f"Error fetching addons: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# ========== COUPON APIs ==========

# Get Active Coupons
@app.route('/api/coupons', methods=['GET'])
def get_coupons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT * FROM Coupon 
            WHERE expired_date >= CURDATE() AND qty > 0
            ORDER BY expired_date DESC
        ''')
        coupons = cursor.fetchall()
        
        for coupon in coupons:
            if coupon['start_date']:
                coupon['start_date'] = coupon['start_date'].strftime('%Y-%m-%d')
            if coupon['expired_date']:
                coupon['expired_date'] = coupon['expired_date'].strftime('%Y-%m-%d')
        
        return jsonify(coupons)
    except Exception as e:
        print(f"Error loading coupons: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# ========== RESERVATION APIs ==========

# Get Guest Reservations
@app.route('/api/guests/<int:guest_id>/reservations', methods=['GET'])
def get_guest_reservations(guest_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT 
                r.reservation_id, r.check_in_date, r.check_out_date, 
                r.number_of_guests, r.room_number, r.total_cost,
                r.pay_method, r.reservation_status,
                rt.name as room_type
            FROM Reservation r
            JOIN Room rm ON r.room_number = rm.room_number
            JOIN Room_Type rt ON rm.type_id = rt.type_id
            WHERE r.guest_id = %s
            ORDER BY r.check_in_date DESC
        ''', (guest_id,)) 
        reservations = cursor.fetchall()
        
        # Get addons for each reservation
        for res in reservations:
            if res['check_in_date']:
                res['check_in_date'] = res['check_in_date'].strftime('%Y-%m-%d')
            if res['check_out_date']:
                res['check_out_date'] = res['check_out_date'].strftime('%Y-%m-%d')
            
            # Get addons
            cursor.execute('''
                SELECT a.addon_id, a.service_name, a.service_cost
                FROM Reservation_Addon ra
                JOIN Addon_Services a ON ra.addon_id = a.addon_id
                WHERE ra.reservation_id = %s
            ''', (res['reservation_id'],))
            res['addons'] = cursor.fetchall()
        
        return jsonify(reservations)
    except Exception as e:
        print(f"Error fetching guest reservations: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# Create Reservation
@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)  # ← Changed to dictionary=True
    
    try:
        # ===== FIX 1: PROPER ROOM AVAILABILITY CHECK =====
        
        # Check if room exists
        cursor.execute('SELECT room_status, type_id FROM Room WHERE room_number = %s', (data['room_number'],))
        room_result = cursor.fetchone()
        
        if not room_result: 
            return jsonify({'error':  'Room not found'}), 404
        
        # Only block Out-of-Service rooms (NOT Occupied!)
        if room_result['room_status'] == 'Out-of-Service':
            return jsonify({'error': 'Room is out of service'}), 400
        
        type_id = room_result['type_id']
        
        # Check for DATE CONFLICTS with existing reservations
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM Reservation 
            WHERE room_number = %s 
            AND reservation_status IN ('Confirmed', 'Checked-In')
            AND (
                (check_in_date <= %s AND check_out_date > %s) OR
                (check_in_date < %s AND check_out_date >= %s) OR
                (check_in_date >= %s AND check_out_date <= %s)
            )
        ''', (
            data['room_number'],
            data['check_in_date'], data['check_in_date'],
            data['check_out_date'], data['check_out_date'],
            data['check_in_date'], data['check_out_date']
        ))
        
        conflict = cursor.fetchone()
        if conflict['count'] > 0:
            return jsonify({'error': 'Room is not available for the selected dates'}), 400
        
        # ===== END FIX 1 =====
        
        # Get room price
        cursor.execute('SELECT price_per_night FROM Room_Type WHERE type_id = %s', (type_id,))
        price_result = cursor.fetchone()
        price = price_result['price_per_night']
        
        # Calculate total cost
        check_in = datetime.strptime(data['check_in_date'], '%Y-%m-%d')
        check_out = datetime.strptime(data['check_out_date'], '%Y-%m-%d')
        nights = (check_out - check_in).days
        
        if nights <= 0:
            return jsonify({'error': 'Check-out date must be after check-in date'}), 400
        
        total_cost = float(price) * nights
        
        # Add addon costs
        addon_ids = data.get('addon_ids', [])
        if addon_ids:
            placeholders = ','.join(['%s'] * len(addon_ids))
            cursor.execute(f'SELECT SUM(service_cost) as total FROM Addon_Services WHERE addon_id IN ({placeholders})', addon_ids)
            result = cursor.fetchone()
            addon_total = result['total'] if result and result['total'] else 0
            total_cost += float(addon_total)
        
        # ===== FIX 2: COUPON DATE VALIDATION =====
        
        coupon_id = data.get('coupon_id', None)
        if coupon_id: 
            cursor.execute('''
                SELECT discount_amount, qty, start_date, expired_date 
                FROM Coupon 
                WHERE coupon_id = %s
            ''', (coupon_id,))
            coupon_result = cursor.fetchone()
            
            if coupon_result: 
                discount_amount = coupon_result['discount_amount']
                qty = coupon_result['qty']
                start_date = coupon_result['start_date']
                expired_date = coupon_result['expired_date']
                
                # Get today's date
                from datetime import date
                today = date.today()
                
                # Validation checks
                if qty <= 0:
                    return jsonify({'error': f'Coupon "{coupon_id}" is out of stock'}), 400
                
                if start_date and today < start_date:
                    return jsonify({'error': f'Coupon "{coupon_id}" is not valid yet.  Valid from {start_date.strftime("%Y-%m-%d")}'}), 400
                
                if expired_date and today > expired_date:
                    return jsonify({'error': f'Coupon "{coupon_id}" has expired on {expired_date.strftime("%Y-%m-%d")}'}), 400
                
                # Apply discount if all validations pass
                discount = float(discount_amount)
                total_cost = total_cost * (1 - discount)
            else:
                return jsonify({'error': f'Coupon "{coupon_id}" does not exist'}), 400
        
        # ===== END FIX 2 =====
        
        # Create reservation
        cursor.execute('''
            INSERT INTO Reservation 
            (guest_id, room_number, coupon_id, check_in_date, check_out_date, 
            total_cost, pay_method, reservation_status, number_of_guests)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (data['guest_id'], data['room_number'], coupon_id, 
            data['check_in_date'], data['check_out_date'], 
            round(total_cost, 2), data['pay_method'], 'Confirmed', data['number_of_guests']))
        
        reservation_id = cursor.lastrowid
        
        # Add addons to junction table
        if addon_ids:
            for addon_id in addon_ids:
                cursor.execute('''
                    INSERT INTO Reservation_Addon (reservation_id, addon_id)
                    VALUES (%s, %s)
                ''', (reservation_id, addon_id))
        
        # ===== FIX 3: DON'T UPDATE ROOM STATUS HERE =====
        # Room status only changes on check-in/check-out
        # DELETE THIS LINE IF IT EXISTS: 
        # cursor.execute('UPDATE Room SET room_status = %s WHERE room_number = %s', ('Occupied', data['room_number']))
        
        # Update coupon quantity
        if coupon_id:
            cursor.execute('UPDATE Coupon SET qty = qty - 1 WHERE coupon_id = %s', (coupon_id,))
        
        conn.commit()
        return jsonify({
            'reservation_id': reservation_id, 
            'total_cost':  round(total_cost, 2), 
            'message': 'Reservation created successfully'
        }), 201
    
    except Exception as e:
        conn.rollback()
        print(f"Error creating reservation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Update Reservation
@app.route('/api/reservations/<int:reservation_id>', methods=['PUT'])
def update_reservation(reservation_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE Reservation 
            SET check_in_date = %s, check_out_date = %s, number_of_guests = %s
            WHERE reservation_id = %s
        ''', (data['check_in_date'], data['check_out_date'], data['number_of_guests'], reservation_id))
        
        conn.commit()
        return jsonify({'message': 'Reservation updated successfully'})
    
    except Exception as e:
        conn.rollback()
        print(f"Error updating reservation: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/reservations/<int:reservation_id>/cancel', methods=['DELETE'])
def cancel_reservation(reservation_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)  # ← Changed to dictionary=True
    
    try:
        # Get reservation details
        cursor.execute('''
            SELECT room_number, coupon_id, reservation_status 
            FROM Reservation 
            WHERE reservation_id = %s
        ''', (reservation_id,))
        result = cursor.fetchone()
        
        if not result:  
            return jsonify({'error':  'Reservation not found'}), 404
        
        room_number = result['room_number']
        coupon_id = result['coupon_id']
        status = result['reservation_status']
        
        # Check if already checked in
        if status == 'Checked-In':
            return jsonify({'error': 'Cannot cancel - guest has checked in'}), 400
        
        # Delete reservation addons first (foreign key constraint)
        cursor.execute('DELETE FROM Reservation_Addon WHERE reservation_id = %s', (reservation_id,))
        
        # Delete the reservation itself
        cursor.execute('DELETE FROM Reservation WHERE reservation_id = %s', (reservation_id,))
        
        # ===== FIX 4: DON'T UPDATE ROOM STATUS HERE =====
        # Room should already be Available if guest hasn't checked in
        # DELETE THIS LINE: 
        # cursor.execute('UPDATE Room SET room_status = %s WHERE room_number = %s', ('Available', room_number))
        
        # Return coupon quantity
        if coupon_id: 
            cursor.execute('UPDATE Coupon SET qty = qty + 1 WHERE coupon_id = %s', (coupon_id,))
        
        conn.commit()
        print(f"Reservation {reservation_id} cancelled successfully")
        return jsonify({'success': True, 'message': 'Reservation cancelled successfully'}), 200
    
    except Exception as e: 
        conn.rollback()
        print(f"Error cancelling reservation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)