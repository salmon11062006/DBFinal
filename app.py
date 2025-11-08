from flask import Flask, redirect, render_template, url_for

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add/reservation')
def get_reservation():
    return render_template('reservation.html')

if __name__ == '__main__':
    app.run(debug=True)