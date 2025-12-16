from flask import Flask, render_template, request, jsonify
import mysql.connector
from datetime import datetime, date

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',  # Change to environment variable
    'database': 'hotelreservation'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# ========== ADMIN PAGES ==========

@app.route('/')
@app.route('/admin')
def admin_portal():
    return render_template('admin_portal.html')

# ========== ADMIN APIs ==========

# Admin Login
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Hardcoded admin credentials
    if username == 'admin' and password == 'admin123':
        return jsonify({'success': True, 'admin':   {'username': username}})
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

# ========== RESERVATION MANAGEMENT ==========

# Get All Reservations
@app.route('/api/admin/reservations', methods=['GET'])
def get_all_reservations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT 
                r.reservation_id, r.check_in_date, r.check_out_date,
                r.reservation_status, r.total_cost, r.pay_method,
                r.room_number, r.number_of_guests,
                g.guest_id, g.name as guest_name, g.email, g.phone,
                rt.name as room_type
            FROM Reservation r
            JOIN Guest g ON r.guest_id = g.guest_id
            JOIN Room rm ON r.room_number = rm.room_number
            JOIN Room_Type rt ON rm.type_id = rt.type_id
            ORDER BY r.check_in_date DESC
        ''')
        reservations = cursor.fetchall()
        
        for res in reservations:
            if res['check_in_date']: 
                res['check_in_date'] = res['check_in_date'].strftime('%Y-%m-%d')
            if res['check_out_date']: 
                res['check_out_date'] = res['check_out_date'].strftime('%Y-%m-%d')
            
            cursor.execute('''
                SELECT a.addon_id, a.service_name, a.service_cost
                FROM Reservation_Addon ra
                JOIN Addon_Services a ON ra.addon_id = a.addon_id
                WHERE ra.reservation_id = %s
            ''', (res['reservation_id'],))
            res['addons'] = cursor.fetchall()
        
        return jsonify(reservations)
    except Exception as e:
        print(f"Error:   {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Check-In Reservation
@app.route('/api/admin/reservations/<int:reservation_id>/checkin', methods=['POST'])
def checkin_reservation(reservation_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get reservation details
        cursor.execute('''
            SELECT room_number, reservation_status 
            FROM Reservation 
            WHERE reservation_id = %s
        ''', (reservation_id,))
        reservation = cursor.fetchone()
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        if reservation['reservation_status'] == 'Checked-In':  
            return jsonify({'error': 'Already checked in'}), 400
        
        if reservation['reservation_status'] == 'Checked-Out':
            return jsonify({'error': 'Reservation already completed'}), 400
        
        # Check if room already has someone checked in
        cursor.execute('''
            SELECT COUNT(*) as count 
            FROM Reservation 
            WHERE room_number = %s 
            AND reservation_status = 'Checked-In'
            AND reservation_id != %s
        ''', (reservation['room_number'], reservation_id))
        
        result = cursor.fetchone()
        if result['count'] > 0:
            return jsonify({
                'error': 'Cannot check in - another guest is currently checked in to this room'
            }), 400
        
        # Update reservation status to Checked-In
        cursor.execute('''
            UPDATE Reservation 
            SET reservation_status = 'Checked-In' 
            WHERE reservation_id = %s
        ''', (reservation_id,))
        
        # Update room status to Occupied
        cursor.execute('''
            UPDATE Room 
            SET room_status = 'Occupied' 
            WHERE room_number = %s
        ''', (reservation['room_number'],))
        
        conn.commit()
        return jsonify({'message': 'Checked in successfully'}), 200
        
    except Exception as e: 
        conn.rollback()
        print(f"Error during check-in: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Check-Out Reservation
@app.route('/api/admin/reservations/<int:reservation_id>/checkout', methods=['POST'])
def checkout_reservation(reservation_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT room_number, reservation_status 
            FROM Reservation 
            WHERE reservation_id = %s
        ''', (reservation_id,))
        reservation = cursor.fetchone()
        
        if not reservation:
            return jsonify({'error': 'Reservation not found'}), 404
        
        if reservation['reservation_status'] == 'Checked-Out':
            return jsonify({'error': 'Already checked out'}), 400
        
        if reservation['reservation_status'] != 'Checked-In':  
            return jsonify({'error': 'Guest has not checked in yet'}), 400
        
        # Update reservation status to Checked-Out
        cursor.execute('''
            UPDATE Reservation 
            SET reservation_status = 'Checked-Out' 
            WHERE reservation_id = %s
        ''', (reservation_id,))
        
        # Update room status to Available
        cursor.execute('''
            UPDATE Room 
            SET room_status = 'Available' 
            WHERE room_number = %s
        ''', (reservation['room_number'],))
        
        conn.commit()
        return jsonify({'message': 'Checked out successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        print(f"Error during check-out: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ========== ROOM TYPE MANAGEMENT ==========

@app.route('/api/admin/room-types', methods=['GET'])
def get_all_room_types():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Room_Type ORDER BY type_id')
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/room-types', methods=['POST'])
def create_room_type():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Room_Type (name, price_per_night) VALUES (%s, %s)',
                    (data['name'], data['price_per_night']))
        conn.commit()
        return jsonify({'type_id': cursor.lastrowid, 'message': 'Room type created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/room-types/<int:type_id>', methods=['PUT'])
def update_room_type(type_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('UPDATE Room_Type SET name = %s, price_per_night = %s WHERE type_id = %s',
                    (data['name'], data['price_per_night'], type_id))
        conn.commit()
        return jsonify({'message': 'Room type updated'})
    except Exception as e: 
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/room-types/<int:type_id>', methods=['DELETE'])
def delete_room_type(type_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT COUNT(*) FROM Room WHERE type_id = %s', (type_id,))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Cannot delete - rooms using this type'}), 400
        
        cursor.execute('DELETE FROM Room_Type WHERE type_id = %s', (type_id,))
        conn.commit()
        return jsonify({'message': 'Room type deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ========== ROOM MANAGEMENT ==========

@app.route('/api/admin/rooms', methods=['GET'])
def get_all_rooms():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT r.room_number, r.room_status, r.type_id,
                rt.name as room_type, rt.price_per_night
            FROM Room r
            JOIN Room_Type rt ON r.type_id = rt.type_id
            ORDER BY r.room_number
        ''')
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/rooms', methods=['POST'])
def create_room():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Room (room_number, type_id, room_status) VALUES (%s, %s, %s)',
                    (data['room_number'], data['type_id'], data.get('room_status', 'Available')))
        conn.commit()
        return jsonify({'message': 'Room created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/rooms/<int:room_number>', methods=['PUT'])
def update_room(room_number):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        new_status = data['room_status']
        
        # Check if room has checked-in guest before setting to Available
        if new_status == 'Available':  
            cursor.execute('''
                SELECT COUNT(*) as count 
                FROM Reservation 
                WHERE room_number = %s 
                AND reservation_status = 'Checked-In'
            ''', (room_number,))
            
            result = cursor.fetchone()
            if result['count'] > 0:
                return jsonify({
                    'error': 'Cannot set room to Available - guest is currently checked in.  Please check out the guest first.'
                }), 400
        
        # Check if setting to Occupied but no one checked in
        if new_status == 'Occupied':  
            cursor.execute('''
                SELECT COUNT(*) as count 
                FROM Reservation 
                WHERE room_number = %s 
                AND reservation_status = 'Checked-In'
            ''', (room_number,))
            
            result = cursor.fetchone()
            if result['count'] == 0:
                return jsonify({
                    'error': 'Cannot set room to Occupied - no guest is checked in. Use check-in button instead.'
                }), 400
        
        # Update if validations pass
        cursor.execute('UPDATE Room SET type_id = %s, room_status = %s WHERE room_number = %s',
                    (data['type_id'], new_status, room_number))
        conn.commit()
        return jsonify({'message':  'Room updated'})
    except Exception as e: 
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/rooms/<int:room_number>', methods=['DELETE'])
def delete_room(room_number):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT COUNT(*) FROM Reservation WHERE room_number = %s', (room_number,))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Cannot delete - room has reservations'}), 400
        
        cursor.execute('DELETE FROM Room WHERE room_number = %s', (room_number,))
        conn.commit()
        return jsonify({'message': 'Room deleted'})
    except Exception as e: 
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ========== ADDON SERVICES MANAGEMENT ==========

@app.route('/api/admin/addons', methods=['GET'])
def get_all_addons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Addon_Services ORDER BY addon_id')
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/addons', methods=['POST'])
def create_addon():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Addon_Services (service_name, service_cost) VALUES (%s, %s)',
                    (data['service_name'], data['service_cost']))
        conn.commit()
        return jsonify({'addon_id':  cursor.lastrowid, 'message': 'Add-on created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/addons/<int:addon_id>', methods=['PUT'])
def update_addon(addon_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('UPDATE Addon_Services SET service_name = %s, service_cost = %s WHERE addon_id = %s',
                    (data['service_name'], data['service_cost'], addon_id))
        conn.commit()
        return jsonify({'message': 'Add-on updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/addons/<int:addon_id>', methods=['DELETE'])
def delete_addon(addon_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT COUNT(*) FROM Reservation_Addon WHERE addon_id = %s', (addon_id,))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Cannot delete - add-on is in use'}), 400
        
        cursor.execute('DELETE FROM Addon_Services WHERE addon_id = %s', (addon_id,))
        conn.commit()
        return jsonify({'message': 'Add-on deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# ========== COUPON MANAGEMENT ==========

@app.route('/api/admin/coupons', methods=['GET'])
def get_all_coupons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Coupon ORDER BY expired_date DESC')
        coupons = cursor.fetchall()
        
        for coupon in coupons: 
            if coupon['start_date']: 
                coupon['start_date'] = coupon['start_date'].strftime('%Y-%m-%d')
            if coupon['expired_date']:
                coupon['expired_date'] = coupon['expired_date'].strftime('%Y-%m-%d')
        
        return jsonify(coupons)
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/coupons', methods=['POST'])
def create_coupon():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO Coupon (coupon_id, discount_amount, qty, start_date, expired_date) VALUES (%s, %s, %s, %s, %s)',
                    (data['coupon_id'], data['discount_amount'], data['qty'], data['start_date'], data['expired_date']))
        conn.commit()
        return jsonify({'message': 'Coupon created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/coupons/<coupon_id>', methods=['PUT'])
def update_coupon(coupon_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('UPDATE Coupon SET discount_amount = %s, qty = %s, start_date = %s, expired_date = %s WHERE coupon_id = %s',
                    (data['discount_amount'], data['qty'], data['start_date'], data['expired_date'], coupon_id))
        conn.commit()
        return jsonify({'message': 'Coupon updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/coupons/<coupon_id>', methods=['DELETE'])
def delete_coupon(coupon_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT COUNT(*) FROM Reservation WHERE coupon_id = %s', (coupon_id,))
        if cursor.fetchone()[0] > 0:
            return jsonify({'error': 'Cannot delete - coupon is in use'}), 400
        
        cursor.execute('DELETE FROM Coupon WHERE coupon_id = %s', (coupon_id,))
        conn.commit()
        return jsonify({'message': 'Coupon deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__': 
    app.run(debug=True, port=5001)