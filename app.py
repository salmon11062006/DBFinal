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
    return render_template('index.html')

@app.route('/reservations')
def reservations_page():
    return render_template('reservation.html')

@app.route('/guests')
def guests_page():
    return render_template('guest.html')

# Guest routes
@app.route('/api/guests', methods=['GET'])
def get_guests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM Guest')
    guests = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(guests)

@app.route('/api/guests', methods=['POST'])
def create_guest():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO Guest (name, email, phone) VALUES (%s, %s, %s)',
        (data['name'], data['email'], data['phone'])
    )
    conn.commit()
    guest_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({'guest_id': guest_id, 'message': 'Guest created successfully'}), 201

@app.route('/api/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE Guest SET name = %s, email = %s, phone = %s WHERE guest_id = %s',
        (data['name'], data['email'], data['phone'], guest_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Guest updated successfully'})

@app.route('/api/guests/<int:guest_id>', methods=['DELETE'])
def delete_guest(guest_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM Guest WHERE guest_id = %s', (guest_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Guest deleted successfully'})

# Room Types
@app.route('/api/roomtypes', methods=['GET'])
def get_room_types():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM RoomType')
    room_types = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(room_types)

# Available Rooms
@app.route('/api/rooms/available', methods=['GET'])
def get_available_rooms():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT r.room_number, r.room_status, rt.name as room_type, rt.price_per_night
        FROM Room r
        JOIN RoomType rt ON r.type_id = rt.type_id
        WHERE r.room_status = 'Vacant'
    ''')
    rooms = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rooms)

# Coupons
@app.route('/api/coupons', methods=['GET'])
def get_coupons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute('''
        SELECT * FROM Coupon 
        WHERE expired_date >= CURDATE() AND qty > 0
    ''')
    coupons = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(coupons)

# Reservations CRUD
@app.route('/api/reservations', methods=['GET'])
def get_reservations():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('''
            SELECT 
                r.reservation_id, r.check_in_date, r.check_out_date, 
                r.number_of_guests, r.room_number,
                COALESCE(g.name, 'Unknown Guest') as guest_name, 
                COALESCE(g.email, 'N/A') as email, 
                COALESCE(g.phone, 'N/A') as phone,
                COALESCE(t.transaction_amt, 0) as transaction_amt, 
                COALESCE(t.pay_status, 'Unknown') as pay_status, 
                COALESCE(t.pay_method, 'N/A') as pay_method,
                COALESCE(rt.name, 'Unknown') as room_type
            FROM Reservation r
            LEFT JOIN Guest g ON r.guest_id = g.guest_id
            LEFT JOIN Transaction t ON r.transaction_id = t.transaction_id
            LEFT JOIN Room rm ON r.room_number = rm.room_number
            LEFT JOIN RoomType rt ON rm.type_id = rt.type_id
            ORDER BY r.reservation_id DESC
        ''')
        reservations = cursor.fetchall()
        
        print(f"Found {len(reservations)} reservations")
        
        # Convert date objects to strings
        for res in reservations:
            if res['check_in_date']:
                res['check_in_date'] = res['check_in_date'].strftime('%Y-%m-%d')
            if res['check_out_date']:
                res['check_out_date'] = res['check_out_date'].strftime('%Y-%m-%d')
        
        return jsonify(reservations)
    except Exception as e:
        print(f"Error fetching reservations: {e}")
        import traceback
        traceback.print_exc()
        return jsonify([])
    finally:
        cursor.close()
        conn.close()

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
        
        # Create transaction
        cursor.execute('''
            INSERT INTO Transaction (transaction_amt, due_date, pay_method, pay_status, coupon_id)
            VALUES (%s, %s, %s, %s, %s)
        ''', (total_amt, data['check_in_date'], data['pay_method'], 'Pending', coupon_id))
        transaction_id = cursor.lastrowid
        
        print(f"Created transaction with ID: {transaction_id}")
        
        # Create reservation
        cursor.execute('''
            INSERT INTO Reservation (check_in_date, check_out_date, number_of_guests, transaction_id, guest_id, room_number)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (data['check_in_date'], data['check_out_date'], data['number_of_guests'], 
              transaction_id, data['guest_id'], data['room_number']))
        reservation_id = cursor.lastrowid
        
        print(f"Created reservation with ID: {reservation_id}")
        
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
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/reservations/<int:reservation_id>', methods=['DELETE'])
def delete_reservation(reservation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get room number before deleting
        cursor.execute('SELECT room_number FROM Reservation WHERE reservation_id = %s', (reservation_id,))
        room_number = cursor.fetchone()[0]
        
        # Delete reservation
        cursor.execute('DELETE FROM Reservation WHERE reservation_id = %s', (reservation_id,))
        
        # Update room status back to vacant
        cursor.execute('UPDATE Room SET room_status = %s WHERE room_number = %s', ('Vacant', room_number))
        
        conn.commit()
        return jsonify({'message': 'Reservation deleted successfully'})
    
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 400
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)