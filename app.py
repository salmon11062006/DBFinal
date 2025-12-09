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
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO Guest (name, email, phone) VALUES (%s, %s, %s)',
            (data['name'], data['email'], data['phone'])
        )
        conn.commit()
        guest_id = cursor.lastrowid
        return jsonify({'guest_id': guest_id, 'message': 'Guest registered successfully'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            UPDATE Guest 
            SET name = %s, email = %s, phone = %s
            WHERE guest_id = %s
        ''', (data['name'], data['email'], data['phone'], guest_id))
        conn.commit()
        return jsonify({'message': 'Guest information updated successfully'})
    except Exception as e:
        conn.rollback()
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