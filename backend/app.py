from flask import Flask, jsonify, make_response, request # Importing the Flask library and some helper functions
import sqlite3 # Library for talking to our database
from datetime import datetime # We'll be working with dates 
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

from flask import Flask
from flask import jsonify
from flask import request

from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import get_jwt
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager
from datetime import timedelta
import uuid

app = Flask(__name__) # Creating a new Flask app. This will help us create API endpoints hiding the complexity of writing network code!
CORS(app)  # Enable CORS for all routes
app.config['JWT_VERIFY_SUB'] = False

# Setup the Flask-JWT-Extended extension
app.config["JWT_SECRET_KEY"] = "super-secret"  # Change this!
jwt = JWTManager(app)

# This function returns a connection to the database which can be used to send SQL commands to the database
def get_db_connection():
  conn = sqlite3.connect('../database/tessera.db')
  conn.row_factory = sqlite3.Row
  return conn

# When asked, add code in this area
def validate_user_credentials(username, password):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Attempt to retrieve the user from the db
        cursor.execute('SELECT password_hash FROM Users WHERE username = ?', (username,))

        row = cursor.fetchone()
        conn.close() 
        if not row:
            return False

        password_hash = row[0]

        # If no such username exists in our system or the password is incorrect we will return 401 Error code
        if not check_password_hash(password_hash, password):
            return False

        return True
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/events', methods=['GET'])
def get_events():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query params
    after_date = request.args.get('afterDate')
    location = request.args.get('location')
    search = request.args.get('search')

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 6))
    offset = (page - 1) * limit

    base_query = "FROM Events"
    conditions = []
    params = []

    # Filters
    if after_date:
        conditions.append("date > ?")
        params.append(after_date)

    if location:
        conditions.append("location = ?")
        params.append(location)

    if search:
        conditions.append(
            "(name LIKE ? OR location LIKE ?)"
        )
        search_term = f"%{search}%"
        params.extend([search_term, search_term])

    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)

    # Total count (for pagination)
    count_query = f"SELECT COUNT(*) {base_query}"
    cursor.execute(count_query, params)
    total_events = cursor.fetchone()[0]

    # Paginated query
    events_query = f"""
        SELECT *
        {base_query}
        ORDER BY date ASC
        LIMIT ? OFFSET ?
    """

    cursor.execute(events_query, params + [limit, offset])
    events = cursor.fetchall()

    conn.close()

    return jsonify({
        "events": [dict(event) for event in events],
        "page": page,
        "limit": limit,
        "total": total_events,
        "totalPages": (total_events + limit - 1) // limit
    }), 200


@app.route('/user', methods=['POST'])
def create_user():
    # Extract email, username, and password from the JSON payload
    email = request.json.get('email')
    username = request.json.get('username')
    password = request.json.get('password')
    first_name = request.json.get('first_name')
    last_name = request.json.get('last_name')

    # Basic validation to ensure all fields are provided
    if not email or not username or not password or not first_name or not last_name:
        return jsonify({'error': 'All fields (email, username, password, first_name, and last_name) are required.'}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Attempt to insert the new user into the Users table
        cursor.execute('INSERT INTO Users (email, first_name, last_name, username, password_hash) VALUES (?, ?, ?, ?, ?)',
                       (email, first_name, last_name, username, hashed_password))
        conn.commit()  # Commit the changes to the database

        # Retrieve the user_id of the newly created user to confirm creation
        cursor.execute('SELECT user_id FROM Users WHERE username = ?', (username,))
        new_user_id = cursor.fetchone()[0]

        conn.close()

        additional_claims = {
                "username": username,
                "role": "user",
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar": None
            }

        access_token = create_access_token(
            identity=str(new_user_id),
            additional_claims=additional_claims,
            expires_delta=timedelta(days=1)
        )

        return jsonify(access_token=access_token), 200

    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists.'}), 409
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def check_login():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Missing JSON body'}), 400

    username = data.get('username')
    password = data.get('password')

    if not (username and password):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        if validate_user_credentials(username, password):
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                "SELECT user_id, role, first_name, last_name, email, avatar FROM Users WHERE username = ?",
                (username,)
            )
            user_id, role, first_name, last_name, email, avatar = cursor.fetchone()
            conn.close()

            additional_claims = {
                "username": username,
                "role": role,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "avatar": avatar
            }

            access_token = create_access_token(
                identity=str(user_id),
                additional_claims=additional_claims,
                expires_delta=timedelta(days=1)
            )

            return jsonify(access_token=access_token), 200
        else:
            return jsonify({'error': 'Incorrect login information'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/login/username', methods=['PUT'])
def change_username():
    # Extract email, password and new username
    email = request.json.get('email')
    password = request.json.get('password')
    new_username = request.json.get('new_username')

    if not email or not password or not new_username:
        return jsonify({'error': 'Must provide an email password and new username'}), 400

    try: 
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT username FROM Users WHERE email = ?", (email,))
        username = cursor.fetchone()[0]

        if username == None:
            conn.close()
            return jsonify({'error': 'There are no users associated with that email'}), 400
        
        if validate_user_credentials(username, password):
            cursor.execute("UPDATE Users SET username = ? WHERE email = ?", (new_username, email))
            conn.commit()  # Commit the changes to the database
            conn.close()
            return jsonify({'message': 'Username successfully changed'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/login/email', methods=['PUT'])
def change_email():
    # Extract username, password, and new email
    new_email = request.json.get('new_email')
    password = request.json.get('password')
    username = request.json.get('username')

    if not username or not password or not new_email:
        return jsonify({'error': 'Must provide an username, password, and new email'}), 400

    try: 
        
        if validate_user_credentials(username, password):
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("UPDATE Users SET email = ? WHERE username = ?", (new_email, username))
            conn.commit()  # Commit the changes to the database
            conn.close()

            return jsonify({'message': 'Email successfully changed'}), 200
        else:
            return jsonify({'error': 'Invalid user credentials'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login/password', methods=['PUT'])
def change_password():
    # Extract username, password, and new email
    old_password = request.json.get('old_password')
    new_password = request.json.get('new_password')
    username = request.json.get('username')

    # User must provide either username or email whichever they are choosing to change, as well as the new one they want to replace it with
    # User must also provide a password to ensure they have the authority to make that change.
    if not old_password or not new_password or not username:
        return jsonify({'error': 'Must provide an old password, new password and username'}), 400

    try: 
        if validate_user_credentials(username, password):
            conn = get_db_connection()
            cursor = conn.cursor()

            new_password_hash = generate_password_hash(new_password)

            cursor.execute("UPDATE Users SET password = ? WHERE username = ?", (new_password_hash, username))
            conn.commit()  # Commit the changes to the database
            conn.close()

            return jsonify({'message': 'Password successfully changed'}), 200
        else:
            return jsonify({'error': 'Invalid user credentials'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/user', methods=['DELETE'])
def delete_user():
    # Extract email, password and new username
    password = request.json.get('password')
    username = request.json.get('username')

    try: 
        if validate_user_credentials(username, password):
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute("DELETE FROM Users WHERE username = ?", (username,))
            conn.commit()
            conn.close()
            return jsonify({'message': 'User successfully deleted'}), 200
        else:
            return jsonify({'error': 'Invalid user credentials'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@app.route('/emails', methods=['GET'])
@jwt_required()
def get_all_emails():

    try: 
        claims = get_jwt()
        if claims['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT email FROM Users')

        emails = cursor.fetchall()
        conn.close()
        
        emails_list = [email[0] for email in emails]
        return jsonify(emails_list)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events', methods=['POST'])
@jwt_required()
def create_event():

    claims = get_jwt()
    if claims['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    # Extract event name, description, location, date and time
    description = request.json.get('description')
    location = request.json.get('location')
    name = request.json.get('name')
    time = request.json.get('time')
    date = request.json.get('date')
    url = request.json.get('url')

    if not (name and description and location and date and time and url):
        return jsonify({'error': 'Must provide a name, description, location, date, time and url'}), 400

    try: 
        conn = get_db_connection()
        cursor = conn.cursor()

        event_date = datetime.strptime(date, "%Y-%m-%d").date()
        event_time = datetime.strptime(time, "%H:%M").time()

        cursor.execute('INSERT INTO Events (name, description, date, time, location, url) VALUES (?, ?, ?, ?, ?, ?)',
                       (name, description, event_date, event_time, location, url))
        conn.commit()  # Commit the changes to the database
        return jsonify({'message': 'Event successfully added'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create_ticket', methods=['POST'])
@jwt_required()
def create_ticket():
    claims = get_jwt()
    if claims['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    # Extract ticket details
    event_id = request.json.get('event_id')
    price = request.json.get('price')
    quantity = request.json.get('quantity')

    if not (event_id and price and quantity):
        return jsonify({'error': 'Must provide an event_id, price, and quantity'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        for _ in range(quantity):
            cursor.execute('INSERT INTO Tickets (event_id, price, status) VALUES (?, ?, ?)',
                           (event_id, price, 'available'))
        conn.commit()
        return jsonify({'message': 'Ticket successfully created'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/buy_ticket', methods=['POST'])
@jwt_required()
def buy_ticket():
    user_id = get_jwt_identity()

    # Extract ticket details
    event_id = request.json.get('event_id')

    if not event_id:
        return jsonify({'error': 'Must provide an event_id'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Find an available ticket for the specified event
        cursor.execute('SELECT ticket_id FROM Tickets WHERE event_id = ? AND status = ? LIMIT 1',
                       (event_id, 'available'))
        ticket = cursor.fetchone()

        if not ticket:
            return jsonify({'error': 'No available tickets for this event'}), 404

        ticket_id = ticket['ticket_id']

        # Update the ticket status to 'sold' and associate it with the user
        cursor.execute('UPDATE Tickets SET status = ?, user_id = ? WHERE ticket_id = ?',
                       ('sold', user_id, ticket_id))
        conn.commit()
        return jsonify({'message': 'Ticket successfully purchased', 'ticket_id': ticket_id}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/check', methods=['GET'])
@jwt_required()
def check_auth():
    user_id = get_jwt_identity()
    claims = get_jwt()

    return jsonify({
        'authenticated': True,
        'user_id': user_id,
        'username': claims.get('username'),
        'role': claims.get('role'),
        'email': claims.get('email'),
        'first_name': claims.get('first_name'),
        'last_name': claims.get('last_name'),
        'avatar': claims.get('avatar')
    }), 200


@app.route('/get_all_tickets', methods=['GET'])
def get_all_tickets():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM Tickets")
    tickets = cur.fetchall()

    conn.close()

    return jsonify({"tickets": [dict(ticket) for ticket in tickets]}), 200

@app.route("/events/add-tickets", methods=["POST"])
def add_tickets():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        conn.execute("PRAGMA foreign_keys = OFF")

        ROWS = ["A", "B", "C", "D", "E"]
        SEATS_PER_ROW = 5

        for event_id in range(1, 13):
            tickets = []
            for row in ROWS:
                for seat in range(1, SEATS_PER_ROW + 1):
                    barcode = str(uuid.uuid4())  # unique barcode
                    tickets.append((event_id, row, seat, "AVAILABLE", barcode))

                # Insert tickets; ignore if already exist
                cur.executemany("""
                    INSERT OR IGNORE INTO Tickets
                    (event_id, row_name, seat_number, status, barcode)
                    VALUES (?, ?, ?, ?, ?)
                """, tickets)

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Tickets added successfully",
            "total_tickets_attempted": len(tickets)
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/add_ticket_prices', methods=['POST'])
def add_ticket_prices():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Define ticket prices for each event
        ticket_prices = [
            (1, 100), (2, 150), (3, 200), (4, 250), (5, 300),
            (6, 350), (7, 400), (8, 450), (9, 500), (10, 550),
            (11, 600), (12, 650)
        ]

        # Insert ticket prices into the database
        cur.executemany("""
            INSERT OR IGNORE INTO TicketPrices
            (event_id, price)
            VALUES (?, ?)
        """, ticket_prices)

        conn.commit()
        conn.close()

        return jsonify({
            "message": "Ticket prices added successfully"
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/set_prices/<int:event_id>/<int:max_price_dollars>', methods=['POST'])
def set_prices(event_id, max_price_dollars):
    max_price_cents = max_price_dollars * 100
    conn = get_db_connection()
    cur = conn.cursor()

    ROWS = ['A', 'B', 'C', 'D', 'E']
    PRICE_DECREMENT_CENTS = 2000  # $10.00 decrement per row

    for i, row in enumerate(ROWS):
        price_cents = max_price_cents - (i * PRICE_DECREMENT_CENTS)
        if price_cents < 0:
            price_cents = 0  # don't go negative

        cur.execute("""
            INSERT INTO Ticket_Prices (event_id, row_name, price_cents)
            VALUES (?, ?, ?)
        """, (event_id, row, price_cents))

        print(f"Set price for Event {event_id} Row {row}: ${price_cents/100:.2f}")

    conn.commit()
    conn.close()
    return jsonify({"message": "Prices set successfully"}), 200


@app.route('/get_ticket_availability/<int:event_id>', methods=['GET'])
@jwt_required()
def get_ticket_availability(event_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT row_name, seat_number, status
        FROM Tickets
        WHERE event_id = ?
    """, (event_id,))

    event_seats = cur.fetchall()
    conn.close()

    # Build nested dictionary: {row_name: {seat_number: availability}}
    availability_dict = {}
    for seat in event_seats:
        row = seat['row_name']
        seat_num = seat['seat_number']
        avail = seat['status']  

        if row not in availability_dict:
            availability_dict[row] = {}

        availability_dict[row][seat_num] = avail

    return jsonify(availability_dict), 200

@app.route('/reserve_seat/<int:event_id>/<string:row_name>/<int:seat_number>', methods=['PUT'])
@jwt_required()
def reserve_seat(event_id, row_name, seat_number):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE Tickets
            SET status = 'RESERVED'
            SET reservation_time = CURRENT_TIMESTAMP
            WHERE event_id = ? AND row_name = ? AND seat_number = ?
        """, (event_id, row_name, seat_number))

        if cur.rowcount == 0:
            conn.close()
            return jsonify({"error": "Seat not found or already reserved"}), 404

        conn.commit()
        conn.close()

        return jsonify({"message": "Seat reserved successfully"}), 200
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@app.route('/unreserve_seat/<int:event_id>/<string:row_name>/<int:seat_number>', methods=['PUT'])
@jwt_required()
def unreserve_seat(event_id, row_name, seat_number):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE Tickets
            SET status = 'AVAILABLE'
            SET reservation_time = NULL
            WHERE event_id = ? AND row_name = ? AND seat_number = ?
        """, (event_id, row_name, seat_number))

        if cur.rowcount == 0:
            conn.close()
            return jsonify({"error": "Seat not found or already available"}), 404

        conn.commit()
        conn.close()

        return jsonify({"message": "Seat unreserved successfully"}), 200
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)