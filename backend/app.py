from flask import Flask, jsonify, make_response, request # Importing the Flask library and some helper functions
import sqlite3 # Library for talking to our database
from datetime import datetime # We'll be working with dates 
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__) # Creating a new Flask app. This will help us create API endpoints hiding the complexity of writing network code!

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
    
    # Start with the base SQL query
    query = 'SELECT * FROM Events'
    query_conditions = []
    params = []
    
    # Check if the 'afterDate' parameter is provided in the query string
    after_date = request.args.get('afterDate')

    if after_date:
        query_conditions.append('date > ?')
        params.append(after_date)

    location = request.args.get('location')

    if location:
        query_conditions.append('location = ?')
        params.append(location)

    if query_conditions:
        query += ' WHERE ' + ' AND '.join(query_conditions)

    
    # Execute the query with or without the date filter
    cursor.execute(query, params)
    events = cursor.fetchall()
    
    # Convert the rows to dictionaries to make them serializable
    events_list = [dict(event) for event in events]
    
    conn.close()
    
    return jsonify(events_list)

@app.route('/user', methods=['POST'])
def create_user():
    # Extract email, username, and password from the JSON payload
    email = request.json.get('email')
    username = request.json.get('username')
    password = request.json.get('password')

    # Basic validation to ensure all fields are provided
    if not email or not username or not password:
        return jsonify({'error': 'All fields (email, username, and password) are required.'}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Attempt to insert the new user into the Users table
        cursor.execute('INSERT INTO Users (email, username, password_hash) VALUES (?, ?, ?)',
                       (email, username, hashed_password))
        conn.commit()  # Commit the changes to the database

        # Retrieve the user_id of the newly created user to confirm creation
        cursor.execute('SELECT user_id FROM Users WHERE username = ?', (username,))
        new_user_id = cursor.fetchone()

        conn.close()

        return jsonify({'message': 'User created successfully', 'user_id': new_user_id['user_id']}), 201

    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists.'}), 409
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['GET'])
def check_login():
    # Extract username, and password from the JSON body
    username = request.json.get('username')
    password = request.json.get('password')

    if not (username and password):
        return jsonify({'error:' : 'All fields (username, and password) are required.'}), 400

    try:
        if validate_user_credentials(username, password):
            return jsonify({'message': 'Valid user credentials'}), 200
        else:
            return jsonify({'error:' : 'Incorrect login information'}), 401

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
def change_email():
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
        



if __name__ == '__main__':
    app.run(debug=True)