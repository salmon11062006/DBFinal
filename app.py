from flask import Flask, request, render_template, jsonify
import mysql.connector

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/guest')
def guest_page():
    return render_template('guest.html')

@app.route('/reservation')
def reservation_page():
    return render_template('reservation.html')

@app.route('/api/guests', methods=['GET'])
def view_guests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Guest")
    guests = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(guests)

@app.route('/api/guests', methods=['POST'])
def add_guest():
    data = request.json
    name = data['name']
    email = data['email']
    phone = data['phone']

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO Guest (name, email, phone) VALUES (%s, %s, %s)", (name, email, phone))
    conn.commit()
    guest_id = cursor.lastrowid
    cursor.close()
    conn.close()

    return jsonify({'guest_id': guest_id, 'message': 'Guest created successfully'}), 201


if __name__ == '__main__':
    app.run(debug=True)