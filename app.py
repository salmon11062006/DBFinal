from flask import Flask, render_template, request, jsonify
import mysql.connector
from datetime import datetime

app = Flask(__name__)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Salomo531',  # Change this
    'database': 'hotelreservation'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

# Routes
@app.route('/')
def index():
    return render_template('guest_portal.html')

# Guest API - Create and Update
@app.route('/api/guests', methods=['POST'])
def create_guest():
    data = request.json
    print(f"Creating guest with data: {data}")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO Guest (name, email, phone) VALUES (%s, %s, %s)',
            (data['name'], data['email'], data['phone'])
        )
        conn.commit()
        guest_id = cursor.lastrowid
        print(f"Guest created successfully with ID: {guest_id}")
        return jsonify({'guest_id': guest_id, 'message': 'Guest registered successfully'}), 201
    except Exception as e:
        conn.rollback()
        print(f"Error creating guest: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    data = request.json
    print(f"Updating guest {guest_id} with data: {data}")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE Guest 
            SET name = %s, email = %s, phone = %s
            WHERE guest_id = %s
        ''', (data['name'], data['email'], data['phone'], guest_id))
        conn.commit()
        print(f"Guest {guest_id} updated successfully")
        return jsonify({'message': 'Guest information updated successfully'})
    except Exception as e:
        conn.rollback()
        print(f"Error updating guest: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Guest Login
@app.route('/api/guests/login', methods=['POST'])
def guest_login():
    data = request.json
    email = data.get('email')
    phone_last4 = data.get('phone_last4')
    
    print(f"Login attempt for email: {email}")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM Guest WHERE email = %s', (email,))
        guest = cursor.fetchone()
        
        if guest:
            # Verify last 4 digits of phone
            if guest['phone'][-4:] == phone_last4:
                print(f"Login successful for guest: {guest['guest_id']}")
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
                print("Phone verification failed")
                return jsonify({'success': False, 'error': 'Invalid phone number'}), 401
        else:
            print("Guest not found")
            return jsonify({'success': False, 'error': 'Email not found'}), 404
    except Exception as e:
        print(f"Error during login: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Available Rooms (Vacant only)
@app.route('/api/rooms/available', methods=['GET'])
def get_available_rooms():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT r.room_number, r.room_status, rt.name as room_type, rt.price_per_night
            FROM Room r
            JOIN RoomType rt ON r.type_id = rt.type_id
            WHERE r.room_status = 'Vacant'
        ''')
        rooms = cursor.fetchall()
        return jsonify(rooms)
    except Exception as e:
        print(f"Error fetching available rooms: {e}")
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# Get Guest Reservations
@app.route('/api/guests/<int:guest_id>/reservations', methods=['GET'])
def get_guest_reservations(guest_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('''
            SELECT 
                r.reservation_id, r.check_in_date, r.check_out_date, 
                r.number_of_guests, r.room_number,
                rt.name as room_type,
                t.transaction_amt, t.pay_status, t.pay_method
            FROM Reservation r
            JOIN Transaction t ON r.transaction_id = t.transaction_id
            JOIN Room rm ON r.room_number = rm.room_number
            JOIN RoomType rt ON rm.type_id = rt.type_id
            WHERE r.guest_id = %s
            ORDER BY r.check_in_date DESC
        ''', (guest_id,))
        reservations = cursor.fetchall()
        
        # Convert date objects to strings
        for res in reservations:
            if res['check_in_date']:
                res['check_in_date'] = res['check_in_date'].strftime('%Y-%m-%d')
            if res['check_out_date']:
                res['check_out_date'] = res['check_out_date'].strftime('%Y-%m-%d')
        
        print(f"Found {len(reservations)} reservations for guest {guest_id}")
        return jsonify(reservations)
    except Exception as e:
        print(f"Error fetching guest reservations: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

# Cancel Reservation
@app.route('/api/reservations/<int:reservation_id>/cancel', methods=['DELETE'])
def cancel_reservation(reservation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get reservation details
        cursor.execute('SELECT room_number, transaction_id FROM Reservation WHERE reservation_id = %s', (reservation_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': 'Reservation not found'}), 404
        
        room_number, transaction_id = result
        
        # Get coupon used (if any)
        cursor.execute('SELECT coupon_id FROM Transaction WHERE transaction_id = %s', (transaction_id,))
        coupon_result = cursor.fetchone()
        coupon_id = coupon_result[0] if coupon_result else None
        
        # Delete reservation
        cursor.execute('DELETE FROM Reservation WHERE reservation_id = %s', (reservation_id,))
        
        # Delete transaction
        cursor.execute('DELETE FROM Transaction WHERE transaction_id = %s', (transaction_id,))
        
        # Update room status back to vacant
        cursor.execute('UPDATE Room SET room_status = %s WHERE room_number = %s', ('Vacant', room_number))
        
        # Return coupon quantity if used
        if coupon_id:
            cursor.execute('UPDATE Coupon SET qty = qty + 1 WHERE coupon_id = %s', (coupon_id,))
        
        conn.commit()
        print(f"Reservation {reservation_id} cancelled successfully")
        return jsonify({'message': 'Reservation cancelled successfully'})
    
    except Exception as e:
        conn.rollback()
        print(f"Error cancelling reservation: {e}")
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
    print(f"Updating reservation {reservation_id} with data: {data}")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE Reservation 
            SET check_in_date = %s, check_out_date = %s, number_of_guests = %s
            WHERE reservation_id = %s
        ''', (data['check_in_date'], data['check_out_date'], data['number_of_guests'], reservation_id))
        
        conn.commit()
        print(f"Reservation {reservation_id} updated successfully")
        return jsonify({'message': 'Reservation updated successfully'})
    
    except Exception as e:
        conn.rollback()
        print(f"Error updating reservation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

# Coupons (Active only)
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
        
        # Convert date objects to strings
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

# Create Reservation (Guest booking)
@app.route('/api/reservations', methods=['POST'])
def create_reservation():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if room is actually available
        cursor.execute('SELECT room_status FROM Room WHERE room_number = %s', (data['room_number'],))
        room_result = cursor.fetchone()
        if not room_result or room_result[0] != 'Vacant':
            return jsonify({'error': 'Room is not available'}), 400
        
        # Calculate total amount
        cursor.execute('SELECT price_per_night FROM RoomType rt JOIN Room r ON rt.type_id = r.type_id WHERE r.room_number = %s', (data['room_number'],))
        price_result = cursor.fetchone()
        if not price_result:
            return jsonify({'error': 'Room not found'}), 400
        price = price_result[0]
        
        check_in = datetime.strptime(data['check_in_date'], '%Y-%m-%d')
        check_out = datetime.strptime(data['check_out_date'], '%Y-%m-%d')
        nights = (check_out - check_in).days
        total_amt = price * nights
        
        # Apply coupon if provided
        coupon_id = data.get('coupon_id', None)
        if coupon_id and coupon_id != '':
            cursor.execute('SELECT discount_amt, qty FROM Coupon WHERE coupon_id = %s', (coupon_id,))
            coupon_result = cursor.fetchone()
            if coupon_result and coupon_result[1] > 0:
                discount = coupon_result[0]
                total_amt = total_amt * (100 - discount) // 100
            else:
                coupon_id = None
        else:
            coupon_id = None
        
        # Create transaction with Pending status (guest needs to pay)
        cursor.execute('''
            INSERT INTO Transaction (transaction_amt, due_date, pay_method, pay_status, coupon_id)
            VALUES (%s, %s, %s, %s, %s)
        ''', (total_amt, data['check_in_date'], data['pay_method'], 'Pending', coupon_id))
        transaction_id = cursor.lastrowid
        
        # Create reservation
        cursor.execute('''
            INSERT INTO Reservation (check_in_date, check_out_date, number_of_guests, transaction_id, guest_id, room_number)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (data['check_in_date'], data['check_out_date'], data['number_of_guests'], 
              transaction_id, data['guest_id'], data['room_number']))
        reservation_id = cursor.lastrowid
        
        # Update room status
        cursor.execute('UPDATE Room SET room_status = %s WHERE room_number = %s', ('Occupied', data['room_number']))
        
        # Update coupon quantity if used
        if coupon_id:
            cursor.execute('UPDATE Coupon SET qty = qty - 1 WHERE coupon_id = %s', (coupon_id,))
        
        conn.commit()
        return jsonify({'reservation_id': reservation_id, 'message': 'Reservation created successfully'}), 201
    
    except Exception as e:
        conn.rollback()
        print(f"Error creating reservation: {e}")
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)