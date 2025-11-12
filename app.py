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

@app.route('/view/guests', methods=['GET'])
def view_guests():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM guests")
    guests = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(guests)

if __name__ == '__main__':
    app.run(debug=True)