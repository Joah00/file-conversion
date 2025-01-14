from sqlalchemy.ext.automap import automap_base
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, jsonify, make_response, request
from flask_cors import CORS
import urllib.parse
from sqlalchemy.orm import Session as DBSession
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, text
import pytesseract
import os
import json
from werkzeug.utils import secure_filename
from flask import send_file
from io import BytesIO
import fitz
import spacy
import base64
import tempfile
import cv2
import numpy as np
import os
from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, JWT_SECRET_KEY, JWT_ACCESS_TOKEN_EXPIRES
import base64
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting
from openpyxl import load_workbook 
from io import BytesIO             
import tempfile    


app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

connection_string = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-LVNJCDK;"
    "DATABASE=neuroformatterDB;"
    "Trusted_Connection=yes;"
)

app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
app.config['JWT_SECRET_KEY'] = JWT_SECRET_KEY
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = JWT_ACCESS_TOKEN_EXPIRES
jwt = JWTManager(app)

db = SQLAlchemy(app)
Base = automap_base()
nlp = spacy.load("en_core_web_sm")

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def name_for_scalar_relationship(base, local_cls, referred_cls, constraint):
    name = referred_cls.__name__.lower() + "_ref"
    return name

def name_for_collection_relationship(base, local_cls, referred_cls, constraint):
    name = referred_cls.__name__.lower() + "_collection"
    return name

with app.app_context():
    Base.prepare(db.engine, reflect=True,
                 name_for_scalar_relationship=lambda base, local_cls, referred_cls, constraint: referred_cls.__name__.lower() + "_ref",
                 name_for_collection_relationship=lambda base, local_cls, referred_cls, constraint: referred_cls.__name__.lower() + "_collection")

    Status = Base.classes.Status
    Authority = Base.classes.Authority
    Account = Base.classes.Account
    User = Base.classes.User
    DeliveryOrder = Base.classes.DeliveryOrder
    ConvertStatus = Base.classes.ConvertStatus
    GoodsReceivedOrder = Base.classes.GoodsReceivedOrder
    Authority = Base.classes.Authority
    GRTemplate = Base.classes.GRTemplate
    
@app.route('/login', methods=['POST'])
def login():
    auth = request.json
    session_db = DBSession(db.engine)

    try:
        # Fetch the user account and associated authority details based on the username
        user = (session_db.query(Account, Authority)
                .join(Authority, Account.authority == Authority.ID)
                .filter(Account.username == auth.get('username'))
                .first())

        # Check if user exists
        if not user:
            session_db.close()
            return jsonify({"msg": "Incorrect username or password"}), 401

        account = user.Account
        authority = user.Authority

        # Check if the user account is active
        if account.status != 1:
            session_db.close()
            return jsonify({"msg": "Account is not active"}), 403

        # Retrieve the stored salt and hash the input password with it
        stored_salt = account.salt
        if not stored_salt:
            session_db.close()
            return jsonify({"msg": "Salt not found for the user"}), 500

        input_password = auth.get('password')
        if not input_password:
            session_db.close()
            return jsonify({"msg": "Password is required"}), 400

        # Hash the input password with the stored salt
        hashed_input_password = session_db.execute(
            text("SELECT HASHBYTES('SHA2_256', :password + CAST(:salt AS NVARCHAR(MAX))) AS hashed_password"),
            {"password": input_password, "salt": stored_salt}
        ).scalar()

        # Compare the hashed input password with the stored password hash
        if account.passwordHash != hashed_input_password:
            session_db.close()
            return jsonify({"msg": "Incorrect username or password"}), 401

        # Generate a JWT token and return the user's role
        authority_desc = authority.desc
        access_token = create_access_token(identity=account.ID)
        session_db.close()
        return jsonify(access_token=access_token, role=authority_desc), 200

    except Exception as e:
        # Close session in case of an exception
        session_db.close()
        return jsonify({"msg": f"An error occurred: {str(e)}"}), 500
    
    
@app.route('/get_displayName', methods=['GET'])
@jwt_required()
def get_display_name():
    user_id = get_jwt_identity()
    session_db = DBSession(db.engine)
    user = session_db.query(User).filter_by(ID=user_id).first()
    session_db.close()

    if user:
        return jsonify({'displayName': user.displayName})
    else:
        return jsonify({'error': 'User not found'}), 404
    

@app.route('/count_converted', methods=['GET'])
@jwt_required()
def count_converted():
    user_id = get_jwt_identity()
    session_db = DBSession(db.engine)
    count = session_db.query(DeliveryOrder).filter(DeliveryOrder.convertStatusId == 1).count()
    session_db.close()
    return jsonify({'count': count})


@app.route('/count_uploaded', methods=['GET'])
@jwt_required()
def count_uploaded():
    user_id = get_jwt_identity()
    session_db = DBSession(db.engine)
    count = session_db.query(DeliveryOrder).filter(DeliveryOrder.uploadBy == user_id).count()
    session_db.close()
    return jsonify({'count': count})


@app.route('/count_failed', methods=['GET'])
@jwt_required()
def count_failed():
    user_id = get_jwt_identity()
    session_db = DBSession(db.engine)
    count = session_db.query(DeliveryOrder).filter(DeliveryOrder.convertStatusId == 2).count()
    session_db.close()
    return jsonify({'count': count})


@app.route('/get_recent_conversions', methods=['GET'])
@jwt_required()
def get_recent_conversions():
    user_id = get_jwt_identity()
    session = db.session()

    results = session.query(
        DeliveryOrder.documentName,
        DeliveryOrder.dateCreated,
        ConvertStatus.desc.label("status")
    ).join(
        ConvertStatus, DeliveryOrder.convertStatusId == ConvertStatus.ID
    ).filter(
        DeliveryOrder.uploadBy == user_id
    ).order_by(
        DeliveryOrder.dateCreated.desc()  
    ).limit(5).all()

    conversions = [
        {
            "documentName": result.documentName,
            "conversionDate": "N/A" if result.status == "Failed" else result.dateCreated.strftime("%Y-%m-%d"),
            "status": result.status
        } for result in results
    ]

    session.close()
    return jsonify(conversions)

@app.route('/get_delivery_orders', methods=['GET'])
@jwt_required()
def get_delivery_orders():
    session = db.session()

    try:
        orders = session.query(
            DeliveryOrder.ID,
            DeliveryOrder.documentName,
            DeliveryOrder.dateCreated,
            User.displayName.label('uploadBy'),
            ConvertStatus.desc.label('status')
        ).join(
            User, DeliveryOrder.uploadBy == User.ID
        ).join(
            ConvertStatus, DeliveryOrder.convertStatusId == ConvertStatus.ID
        ).all()

        results = [{
            'ID': order.ID,
            'uploadBy': order.uploadBy,
            'doid': order.ID,
            'documentName': order.documentName,
            'uploadDate': order.dateCreated.strftime('%d-%m-%Y') if order.dateCreated else None,
            'status': order.status
        } for order in orders]

        session.close()
        return jsonify(results)
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500


@app.route('/get_delivery_order_file/<int:id>', methods=['GET'])
@jwt_required()
def get_delivery_order_file(id):
    session = db.session()

    try:
        # Query the DeliveryOrder table by ID
        delivery_order = session.query(DeliveryOrder).filter_by(ID=id).first()

        # Ensure the record exists and has file data
        if not delivery_order or not delivery_order.DOfile:
            return jsonify({'error': 'File not found'}), 404

        file_data = delivery_order.DOfile

        # Set Content-Type and filename for PDF files
        response = make_response(file_data)
        response.headers.set('Content-Type', 'application/pdf')
        response.headers.set('Content-Disposition', f'attachment; filename="{delivery_order.documentName}"')
        
        return response

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'Failed to retrieve file: {str(e)}'}), 500

    finally:
        session.close()

@app.route('/get_goods_received_order_file/<int:id>', methods=['GET'])
@jwt_required()
def get_goods_received_order_file(id):
    session = db.session()

    try:
        # Query the GoodsReceivedOrder table by ID
        goods_received_order = session.query(GoodsReceivedOrder).filter_by(ID=id).first()

        # Ensure the record exists and has file data
        if not goods_received_order or not goods_received_order.GRfile:
            return jsonify({'error': 'File not found'}), 404

        file_data = goods_received_order.GRfile

        # Set Content-Type and filename for the file (use the appropriate content type)
        response = make_response(file_data)
        response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')  # MIME type for Excel
        response.headers.set('Content-Disposition', f'attachment; filename="{goods_received_order.documentName}.xlsx"')  # Ensure the filename ends with .xlsx

        return response

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'Failed to retrieve file: {str(e)}'}), 500

    finally:
        session.close()

@app.route('/get_goods_received_orders', methods=['GET'])
@jwt_required()
def get_goods_received_orders():
    session = db.session()

    try:
        orders = session.query(
            User.displayName.label('createdBy'),
            GoodsReceivedOrder.ID.label('grid'),  
            DeliveryOrder.ID.label('doid'),
            GoodsReceivedOrder.documentName.label('grDocumentName'),  
            DeliveryOrder.documentName.label('doDocumentName'), 
            GoodsReceivedOrder.dateConverted
        ).join(
            User, GoodsReceivedOrder.createdBy == User.ID
        ).join(
            DeliveryOrder, GoodsReceivedOrder.deliverOrderId == DeliveryOrder.ID
        ).all()

        results = [{
            'convertedBy': order.createdBy,
            'grid': order.grid,
            'doid': order.doid,
            'grDocumentName': order.grDocumentName,  
            'doDocumentName': order.doDocumentName, 
            'convertedDate': order.dateConverted.strftime('%d-%m-%Y') if order.dateConverted else None
        } for order in orders]

        session.close()
        return jsonify(results)
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500


@app.route('/get_account_user_info', methods=['GET'])
@jwt_required()
def get_account_user_info():
    session = db.session()

    try:
        results = session.query(
            Account.username,
            User.employeeID,
            Account.ID,
            Status.desc,
            Authority.desc.label("role") 
        ).outerjoin(
            User, Account.ID == User.accountID
        ).join(
            Status, Status.ID == Account.status
        ).join(
            Authority, Authority.ID == Account.authority 
        ).all()

        data = [{
            'username': result.username,
            'employeeID': result.employeeID if result.employeeID else 'New User',
            'ID': result.ID,
            'status': result.desc,
            'role': result.role 
        } for result in results]

        session.close()

        return jsonify(data)
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500
    

@app.route('/create_account', methods=['POST'])
@jwt_required()
def create_account():
    session = db.session()

    try:
        data = request.json
        status = data.get('status')
        authority = data.get('authority')
        username = data.get('username')
        password = data.get('password')

        # Validate required fields
        if not all([status, authority, username, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Generate a unique salt for the user
        salt = session.execute(
            text("SELECT CRYPT_GEN_RANDOM(32) AS salt")
        ).scalar()

        # Hash the password with the generated salt
        hashed_password = session.execute(
            text("SELECT HASHBYTES('SHA2_256', :password + CAST(:salt AS NVARCHAR(MAX))) AS hashed_password"),
            {"password": password, "salt": salt}
        ).scalar()

        # Create a new account with hashed password and salt
        new_account = Account(
            status=status,
            authority=authority,
            username=username,
            passwordHash=hashed_password,  # Store the hashed password
            salt=salt,  # Store the generated salt
            dateCreated=db.func.current_timestamp()
        )

        session.add(new_account)
        session.commit()
        session.close()

        return jsonify({'message': 'Account created successfully'}), 201
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500


@app.route('/update_account/<int:id>', methods=['PUT'])
@jwt_required()
def update_account(id):
    session = db.session()
    data = request.get_json()

    try:
        # Find the account by ID
        account = session.query(Account).filter_by(ID=id).first()

        if not account:
            return jsonify({'error': 'Account not found'}), 404

        # Update username if provided
        account.username = data.get('username', account.username)

        # Update password if provided
        new_password = data.get('password')
        if new_password:
            # Generate a new salt
            new_salt = session.execute(
                text("SELECT CRYPT_GEN_RANDOM(32) AS salt")
            ).scalar()

            # Hash the new password with the new salt
            hashed_password = session.execute(
                text("SELECT HASHBYTES('SHA2_256', :password + CAST(:salt AS NVARCHAR(MAX))) AS hashed_password"),
                {"password": new_password, "salt": new_salt}
            ).scalar()

            # Update the account's passwordHash and salt
            account.passwordHash = hashed_password
            account.salt = new_salt

        # Update authority if provided
        authority = data.get('authority')
        if authority is not None:
            account.authority = authority

        session.commit()
        session.close()

        return jsonify({'message': 'Account updated successfully'}), 200
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500

    
@app.route('/change_account_status/<int:id>', methods=['PUT'])
@jwt_required()
def update_account_status(id):
    session = db.session()
    data = request.get_json()

    try:
        # Retrieve the new status value from the request data
        new_status = data.get('status')

        if new_status is None:
            return jsonify({'error': 'Status is required'}), 400

        # Find the account by ID
        account = session.query(Account).filter_by(ID=id).first()

        if not account:
            return jsonify({'error': 'Account not found'}), 404

        # Update the status
        account.status = new_status

        # Commit the changes
        session.commit()
        session.close()

        return jsonify({'message': 'Account status updated successfully'}), 200
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500
    

@app.route('/get_employee_information', methods=['GET'])
@jwt_required()
def get_employee_information():
    session = db.session()

    try:
        # Query the User table to get employee information
        results = session.query(
            User.ID,
            User.employeeID,
            User.name,
            User.email,
            User.phoneNumber,
            User.icNumber,
            User.gender
        ).all()

        # Format the data as a list of dictionaries
        data = [{
            'Id': result.ID,
            'employeeID': result.employeeID,
            'name': result.name,
            'email': result.email,
            'phoneNumber': result.phoneNumber,
            'icNumber': result.icNumber,
            'gender': result.gender
        } for result in results]

        session.close()
        # Return the data as JSON
        return jsonify(data), 200

    except Exception as e:
        # Rollback in case of error and return the error message
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500
    

@app.route('/get_new_employee_username', methods=['GET'])
@jwt_required()
def get_accounts_without_user_info():
    session = db.session()

    try:
        # Query to get accounts without associated user information
        results = session.query(
            Account.username,
            Account.ID
        ).outerjoin(User, Account.ID == User.accountID).filter(
            User.accountID == None
        ).all()

        # Format the data as a list of dictionaries
        data = [{
            'username': result.username,
            'ID': result.ID  # Use this ID for update or create, keep it hidden in the UI
        } for result in results]

        session.close()
        # Return the data as JSON
        return jsonify(data), 200

    except Exception as e:
        # Rollback in case of error and log the error
        session.rollback()
        print(f"Error fetching accounts without user info: {str(e)}")  # Log the error message
        session.close()
        # Return the error message as JSON
        return jsonify({'error': 'Failed to fetch accounts without user info', 'details': str(e)}), 500


@app.route('/create_user', methods=['POST'])
@jwt_required()
def create_user():
    session = db.session()

    try:
        # Get the JSON data from the request
        data = request.get_json()

        # Check for duplicate employeeID or email
        existing_user = session.query(User).filter(
            (User.employeeID == data["employeeID"]) | (User.email == data["email"])
        ).first()

        if existing_user:
            return jsonify({'error': 'EmployeeID or Email already exists'}), 400

        # Create a new User object
        new_user = User(
            accountID=data["accountID"],
            employeeID=data["employeeID"],
            name=data["name"],
            email=data["email"],
            phoneNumber=data["phoneNumber"],
            gender=data["gender"],
            icNumber=data["icNumber"],
            displayName=data["displayName"]
        )

        # Add and commit the new user
        session.add(new_user)
        session.commit()

        return jsonify({'message': 'User created successfully'}), 201

    except IntegrityError:
        session.rollback()
        return jsonify({'error': 'Database integrity error occurred'}), 500

    except Exception as e:
        session.rollback()
        print(f"Error creating user: {str(e)}")
        return jsonify({'error': 'Failed to create user', 'details': str(e)}), 500

    finally:
        session.close()


@app.route('/update_user/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    session = db.session()

    try:
        # Get the request data
        data = request.json

        # Validate that all required fields are present
        required_fields = ['employeeID', 'name', 'email', 'phoneNumber', 'icNumber', 'gender']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f'Missing fields: {", ".join(missing_fields)}'}), 400

        # Check if the user exists
        user = session.query(User).filter_by(ID=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check for unique constraints violations
        # Ensure employeeID is unique
        existing_employee = session.query(User).filter(User.employeeID == data['employeeID'].upper(), User.ID != user_id).first()
        if existing_employee:
            return jsonify({'error': 'EmployeeID already exists for another user'}), 409

        # Ensure email is unique
        existing_email = session.query(User).filter(User.email == data['email'].lower(), User.ID != user_id).first()
        if existing_email:
            return jsonify({'error': 'Email already exists for another user'}), 409

        # Ensure icNumber is unique
        existing_ic_number = session.query(User).filter(User.icNumber == data['icNumber'], User.ID != user_id).first()
        if existing_ic_number:
            return jsonify({'error': 'IC Number already exists for another user'}), 409

        # Update user details
        user.employeeID = data['employeeID'].upper()
        user.name = data['name'].upper()
        user.email = data['email'].lower()
        user.phoneNumber = data['phoneNumber']
        user.icNumber = data['icNumber']
        user.gender = data['gender']

        # Commit changes
        session.commit()
        session.close()

        # Return success response
        return jsonify({'message': 'User updated successfully'}), 200

    except Exception as e:
        # Rollback in case of error and log the error
        session.rollback()
        session.close()
        return jsonify({'error': f'Failed to update user: {str(e)}'}), 500
    

@app.route('/update_display_name', methods=['PUT'])
@jwt_required()
def update_display_name():
    session = db.session()

    try:
        # Get the user ID from the token
        user_id = get_jwt_identity()

        # Get the new display name from the request body
        data = request.json
        new_display_name = data.get('displayName')

        if not new_display_name:
            return jsonify({'error': 'Display name is required'}), 400

        # Find the user in the database
        user = session.query(User).filter_by(ID=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Update the display name
        user.displayName = new_display_name
        session.commit()
        session.close()

        # Return success response
        return jsonify({'message': 'Display name updated successfully'}), 200

    except Exception as e:
        # Rollback in case of error and log the error
        session.rollback()
        session.close()
        return jsonify({'error': f'Failed to update display name: {str(e)}'}), 500
    

@app.route('/change_password', methods=['PUT'])
@jwt_required()
def change_password():
    session = db.session()

    try:
        # Get the user ID from the token
        user_id = get_jwt_identity()

        # Get the old and new passwords from the request body
        data = request.json
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')

        if not old_password or not new_password:
            return jsonify({'error': 'Both old and new passwords are required'}), 400

        # Find the user in the database
        user = session.query(User).filter_by(ID=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Find the account associated with this user
        account = session.query(Account).filter_by(ID=user.accountID).first()
        if not account:
            return jsonify({'error': 'Account not found'}), 404

        # Retrieve the stored salt and hash the old password for verification
        stored_salt = account.salt
        hashed_old_password = session.execute(
            text("SELECT HASHBYTES('SHA2_256', :old_password + CAST(:salt AS NVARCHAR(MAX))) AS hashed_password"),
            {"old_password": old_password, "salt": stored_salt}
        ).scalar()

        # Verify the hashed old password matches the stored passwordHash
        if account.passwordHash != hashed_old_password:
            return jsonify({'error': 'Incorrect old password'}), 401

        # Generate a new salt for the new password
        new_salt = session.execute(
            text("SELECT CRYPT_GEN_RANDOM(32) AS salt")
        ).scalar()

        # Hash the new password with the new salt
        hashed_new_password = session.execute(
            text("SELECT HASHBYTES('SHA2_256', :new_password + CAST(:salt AS NVARCHAR(MAX))) AS hashed_password"),
            {"new_password": new_password, "salt": new_salt}
        ).scalar()

        # Update the account's passwordHash and salt with the new values
        account.passwordHash = hashed_new_password
        account.salt = new_salt

        # Commit the changes to the database
        session.commit()
        session.close()

        # Return success response
        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        # Rollback in case of error and log the error
        session.rollback()
        session.close()
        return jsonify({'error': f'Failed to change password: {str(e)}'}), 500


@app.route('/get_user_details', methods=['GET'])
@jwt_required()
def get_user_details():
    session = db.session()
    
    try:
        # Get the user ID from the token
        user_id = get_jwt_identity()
        
        # Query to fetch the user details, including authority description
        result = session.query(
            User.employeeID,
            User.name,
            User.email,
            User.phoneNumber,
            User.gender,
            User.icNumber,
            User.displayName,
            Authority.desc  # Authority description
        ).join(Account, Account.ID == User.accountID) \
         .join(Authority, Account.authority == Authority.ID) \
         .filter(User.ID == user_id).first()

        # Check if the result is found
        if not result:
            return jsonify({'error': 'User not found'}), 404

        # Prepare the data to be returned as JSON
        user_data = {
            'employeeID': result.employeeID,
            'name': result.name,
            'email': result.email,
            'phoneNumber': result.phoneNumber,
            'gender': result.gender,
            'icNumber': result.icNumber,
            'displayName': result.displayName,
            'authorityDescription': result.desc 
        }

        # Close the session
        session.close()
        
        # Return the user details as a JSON response
        return jsonify(user_data), 200

    except Exception as e:
        # Rollback in case of an error and close the session
        session.rollback()
        session.close()
        return jsonify({'error': f'Failed to fetch user details: {str(e)}'}), 500
    

@app.route('/get_history', methods=['GET'])
@jwt_required()
def get_history():
    session = db.session()

    try:
        # Get the user ID from the JWT token
        user_id = get_jwt_identity()

        # Execute the query to get delivery orders with their associated goods received orders
        results = session.query(
            DeliveryOrder.ID.label('DOID'),
            DeliveryOrder.documentName.label('DO_document_Name'),
            func.coalesce(GoodsReceivedOrder.ID, '-').label('GRID'),
            func.coalesce(GoodsReceivedOrder.documentName, '-').label('GR_document_Name'),
            GoodsReceivedOrder.dateConverted.label('dateConverted'),
            func.coalesce(ConvertStatus.desc, '-').label('status'),
            DeliveryOrder.dateCreated.label('Uploaded_Date')
        ).outerjoin(
            GoodsReceivedOrder, 
            (GoodsReceivedOrder.deliverOrderId == DeliveryOrder.ID) & 
            (GoodsReceivedOrder.createdBy == user_id)  
        ).outerjoin(
            ConvertStatus, ConvertStatus.ID == DeliveryOrder.convertStatusId
        ).filter(DeliveryOrder.uploadBy == user_id).all()

        # Format the results as a list of dictionaries
        data = [
            {
                'DOID': result.DOID,
                'DO_document_Name': result.DO_document_Name,
                'GRID': result.GRID,
                'GR_document_Name': result.GR_document_Name,
                # Convert dateConverted to a string if it's not None, otherwise set to '-'
                'dateConverted': result.dateConverted.strftime('%Y-%m-%d') if result.dateConverted else '-',
                'status': result.status,
                # Convert Uploaded_Date to a string if it's not None, otherwise set to '-'
                'Uploaded_Date': result.Uploaded_Date.strftime('%Y-%m-%d') if result.Uploaded_Date else '-'
            } for result in results
        ]

        # Close the session
        session.close()

        # Return the data as a JSON response
        return jsonify(data), 200

    except Exception as e:
        # Handle errors, rollback the session, and return an error message
        session.rollback()
        session.close()
        return jsonify({'error': f'Failed to fetch history data: {str(e)}'}), 500


@app.route('/upload_delivery_order', methods=['POST'])
@jwt_required()
def upload_delivery_order():
    session = db.session()

    try:
        # Get the user ID from the token
        user_id = get_jwt_identity()

        # Check if files are uploaded
        if not request.files:
            return jsonify({'error': 'No files uploaded'}), 400

        # Loop over the uploaded files and add each one to the database
        for key in request.files:
            file = request.files[key]
            file_data = file.read()  # Read the file content as bytes
            
            # Insert into the DeliveryOrder table
            delivery_order = DeliveryOrder(
                uploadBy=user_id,
                convertStatusId=3, #New status
                DOfile=file_data,
                documentName=file.filename
            )
            session.add(delivery_order)

        # Commit the transaction
        session.commit()
        return jsonify({'message': 'Files uploaded successfully!'}), 200

    except Exception as e:
        session.rollback()
        return jsonify({'error': f'Failed to upload delivery order: {str(e)}'}), 500

    finally:
        session.close()

@app.route('/upload_goods_received_order', methods=['POST'])
@jwt_required()
def upload_goods_received_order():
    userID = get_jwt_identity()
    # Check if a file is provided in the request
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    # Get required form fields
    deliver_order_id = request.form.get('deliverOrderId')
    created_by = userID
    template_file_id = request.form.get('templateFileId')
    document_name = request.form.get('documentName')
    
    if not deliver_order_id or not created_by or not template_file_id or not document_name:
        return jsonify({'error': 'Missing required parameters'}), 400

    # Check if file is valid
    if not document_name.endswith(('xlsx')):
        return jsonify({'error': 'Invalid file type. Only XLSX files are allowed.'}), 400

    try:
        session_db = db.session()

        # Convert the file to VARBINARY
        grfile = file.read()

        # Create a new GoodsReceivedOrder instance
        gr_order = GoodsReceivedOrder(
            deliverOrderId=deliver_order_id,
            createdBy=created_by,
            GRfile=grfile,
            documentName=document_name,
            templateFile=template_file_id
        )

        # Add and commit to the database
        session_db.add(gr_order)
        session_db.commit()

        return jsonify({'message': 'GoodsReceivedOrder uploaded successfully', 'grOrderId': gr_order.ID}), 200

    except Exception as e:
        session_db.rollback()  # Rollback any changes if there's an error
        return jsonify({'error': f'Failed to upload GoodsReceivedOrder: {str(e)}'}), 500

    finally:
        session_db.close()


@app.route('/update_convert_status', methods=['POST'])
def update_convert_status_endpoint():
    try:
        # Get convert_status and do_id from the request JSON
        data = request.get_json()
        convert_status = data.get('convert_status')
        do_id = data.get('do_id')

        # Ensure both parameters are provided
        if not convert_status or not do_id:
            return jsonify({'error': 'Both convert_status and do_id are required'}), 400
        
        # Call the update function
        result = update_convert_status(convert_status, do_id)
        return jsonify({'message': result}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint to get the latest Delivery Order ID
@app.route('/get_latest_doid', methods=['GET'])
def get_latest_doid_endpoint():
    try:
        # Call the function to get the latest DOID
        latest_doid = get_latest_doid()
        
        if latest_doid is None:
            return jsonify({'error': 'No Delivery Orders found'}), 404
        
        return jsonify({'latest_doid': latest_doid}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def update_convert_status(convert_status: int, do_id: int) -> str:
    session_db = DBSession(db.engine)

    try:
        # Fetch the delivery order record
        delivery_order = session_db.query(DeliveryOrder).filter_by(ID=do_id).first()

        if not delivery_order:
            raise ValueError(f"No DeliveryOrder found with ID {do_id}")

        # Update the convert status
        delivery_order.convertStatusId = convert_status 
        session_db.commit()

        return f"Convert status updated to {convert_status} for DeliveryOrder ID {do_id}"

    except Exception as e:
        session_db.rollback()  # Rollback any changes if there's an error
        raise RuntimeError(f"Failed to update convert status: {str(e)}")

    finally:
        session_db.close()


def get_latest_doid():
    session = db.session()
    try:
        latest_doid = session.query(DeliveryOrder.ID).order_by(DeliveryOrder.ID.desc()).first()
        if latest_doid:
            return latest_doid[0]
        return None
    except Exception as e:
        raise Exception(f"Error retrieving the latest DOID: {str(e)}")
    finally:
        session.close()


custom_config = r'--psm 6 -c tessedit_char_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-()&/"'
# Create output directory for debugging images
output_dir = "ocr_debug_images"
os.makedirs(output_dir, exist_ok=True)

def save_image(image, filename):
    """ Helper function to save images for debugging purposes """
    filepath = os.path.join(output_dir, filename)
    cv2.imwrite(filepath, image)
    print(f"Image saved at {filepath}")

#zoom extract scroll algorithm (passed)
#Step 3: Using Z.E.S algorithm to process the image for later use
def zoom_extract_scroll(image, page_num, scroll_height=500):
    do_id = get_latest_doid()
    text = ""
    img_height = image.shape[0]
    current_y = 0
    segment_num = 1

    while current_y < img_height:
        try:
            segment = image[current_y:current_y + scroll_height, :]
            scale_factor = 2
            zoomed_segment = cv2.resize(segment, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
            save_image(zoomed_segment, f"page_{page_num}_segment_{segment_num}_zoomed.png")
            ocr_text = pytesseract.image_to_string(zoomed_segment, config=custom_config)
            print(f"OCR Text for Page {page_num}, Segment {segment_num}: {ocr_text}")
            text += ocr_text + "\n\n"
        except Exception as e:
            update_convert_status(2, int(do_id)) #Failed status
            print(f"Error processing segment {segment_num} of page {page_num}: {e}")

        current_y += scroll_height
        segment_num += 1

    return text

#Step 4: NLP to recognize price and description (spaCy)
# def extract_description_and_price(text):
#     descriptions = []
#     prices = []

#     # Define table-like patterns for rows
#     table_row_pattern = r"^\d+.*?[A-Za-z].*?[\d,.]+$"  # Row with index, description, and price
#     price_pattern = r"\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b"  # General price pattern

#     # Define exclusion patterns for irrelevant blocks
#     exclusion_patterns = [
#         r"^\s*$",  # Empty lines
#         r"(Phone|Address|Tax|Bank|Line No|RINGGITMALAYSIA|PaymentTerms)",  # Irrelevant blocks
#     ]

#     # Split text into lines
#     lines = text.splitlines()

#     for line in lines:
#         line = line.strip()

#         # Skip lines matching exclusion patterns
#         if any(re.search(pattern, line) for pattern in exclusion_patterns):
#             continue

#         # Process table-like rows
#         if re.match(table_row_pattern, line):
#             # Split the row into components (item code, description, qty, price)
#             parts = re.split(r'\s{2,}|\t|UNIT|RM', line)  # Split on spaces, tabs, or units
#             parts = [p.strip() for p in parts if p.strip()]  # Clean empty parts

#             if len(parts) >= 2:  # Ensure row has at least a description and price
#                 descriptions.append(parts[0])  # Add the description (first meaningful part)

#             # Extract price from the line
#             price_match = re.search(price_pattern, line)
#             if price_match:
#                 prices.append(price_match.group(0))

#     # Deduplicate results and return structured data
#     return {
#         "Description": list(set(descriptions)),  # Remove duplicates
#         "Unit Price": list(set(prices))          # Remove duplicates
#     }

#Step 4: NLP to recognize price and description with google gemini
def extract_description_and_price(text):
    do_id = get_latest_doid()
    # Initialize Vertex AI with your project and region
    vertexai.init(project="file-conversion-do-to-gr", location="us-central1")
    
    # Load the Generative Model
    model = GenerativeModel("gemini-1.5-flash-002")

    # Prepare the input text for content generation
    input_text = [f"""
    Extract and organize the descriptions and prices from the following text which is generated from OCR. 
    Format the result as a JSON object with "Description", "Qty", and "Unit Price". 
    Include only meaningful product descriptions, their respective prices, and quantity as well.

    Text:
    {text}

    Example response:
    {{
        "Description": [
            "Console Cable USB Type-C to RJ45 (Length 2M)",
            "Power cord (Lagavulin)"
        ],
        "Qty": [
            "6",
            "8"
        ],
        "Unit Price": [
            "RM 53.66",
            "RM 29.09"
        ]
    }}
    """]

    # Generation configuration
    generation_config = {
        "max_output_tokens": 256,
        "temperature": 0.7,
        "top_p": 0.9,
    }

    # Safety settings
    safety_settings = [
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
        SafetySetting(
            category=SafetySetting.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=SafetySetting.HarmBlockThreshold.OFF,
        ),
    ]

    try:
        # Generate response using the model
        responses = model.generate_content(
            input_text,
            generation_config=generation_config,
            safety_settings=safety_settings,
            stream=True,
        )

        print("Raw API Responses:")
        complete_response = []
        for response in responses:
            print(response.text)  # Debug raw response
            complete_response.append(response.text.strip())

        # Combine responses and clean formatting
        clean_response = " ".join(complete_response).strip("```").strip()
        if clean_response.startswith("json"):
            clean_response = clean_response[4:].strip()

        # Debug cleaned response
        print("Cleaned Raw Response:", clean_response)

        # Parse JSON response
        try:
            parsed_response = json.loads(clean_response)
            print("Parsed JSON:", parsed_response)  # Debug parsed output
            return parsed_response
        except json.JSONDecodeError as e:
            update_convert_status(2, int(do_id)) #Failed status
            print(f"JSON decoding error: {e}")
            print(f"Cleaned Raw Response: {clean_response}")
            return {"Description": [], "Unit Price": []}

    except Exception as e:
        update_convert_status(2, int(do_id)) #Failed status
        print(f"Error using Google Gemini API: {e}")
        return {
            "Description": [],
            "Unit Price": [],
            "Qty": []
        }

#Step 2: Converting PDF to image
def extract_text_from_pdf(file):
    structured_data = {'description': [], 'unit_price': [], 'qty': []}
    all_text = ""  # To store the full extracted text

    pdf_document = fitz.open(stream=file.read(), filetype="pdf") 
    do_id = get_latest_doid()
        
    for page_num in range(len(pdf_document)):
        try:
            # Get the current page
            page = pdf_document[page_num]

            # Render the page as an image (pixmap)
            pix = page.get_pixmap(dpi=300)  # Adjust DPI for better quality
            img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)  # Convert to OpenCV-compatible format

            # If the image is in grayscale, reshape it accordingly
            if pix.n == 1:  # Grayscale
                img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)

            # Use the "zoom-extract-scroll" function to process the image
            page_text = zoom_extract_scroll(img_array, page_num + 1)
            all_text += page_text  # Append to the full text output

            # Extract structured data (descriptions and unit prices) using NLP and regex
            extracted_data = extract_description_and_price(page_text)

            # Validate and append extracted data
            if isinstance(extracted_data, dict) and "Description" in extracted_data and "Unit Price" in extracted_data:
                structured_data['description'].extend(
                    [desc.strip() for desc in extracted_data['Description'] if isinstance(desc, str)]
                )
                structured_data['unit_price'].extend(
                    [price.strip() for price in extracted_data['Unit Price'] if isinstance(price, str)]
                )
                structured_data['unit_price'].extend(
                    [price.strip() for price in extracted_data.get('Unit Price', []) if isinstance(price, str)]
                )
            else:
                print(f"Invalid data returned for page {page_num + 1}: {extracted_data}")

        except Exception as e:
            update_convert_status(2, int(do_id))
            print(f"Error processing page {page_num + 1}: {e}")

    pdf_document.close()
    return all_text, structured_data


#Step 1: calling this endpoint
@app.route('/extract_text', methods=['POST'])
def extract_text():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file or not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400

    do_id = get_latest_doid()
    
    try:
        # Extract text and structured data from the PDF
        extracted_text, structured_data = extract_text_from_pdf(file)

        # Return both the full text and the structured data for mapping
        return jsonify({
            'extracted_text': extracted_text,
            'structured_data': structured_data
        }), 200
    except Exception as e:  
        update_convert_status(2, int(do_id)) #Failed status
        return jsonify({'error': f'Failed to extract text: {str(e)}'}), 500
    


 #Step 5: mapping to template
@app.route('/map_to_template', methods=['POST'])
@jwt_required()
def map_to_template():
    try:
        data = request.get_json()
        template_id = data.get('template_id')
        structured_data = data.get('structured_data')
        # #Dummy Data
        # structured_data = {
        #     "description": [
        #         "Console Cable USB Type-C to RJ45 (Length 2M)",
        #         "Power Cord (Lagavulin)"
        #     ],
        #     "qty": ["6", "8"],
        #     "unit_price": ["RM 53.66", "RM 29.09"]
        # }

        do_id = get_latest_doid()

        if not template_id or not structured_data:
            update_convert_status(2, int(do_id)) #Failed status
            return jsonify({'error': 'Template ID and structured data are required'}), 400

        # Fetch template from the database
        template = db.session.query(GRTemplate).filter_by(ID=template_id).first()
        if not template or not template.templateFile:
            update_convert_status(2, int(do_id)) #Failed status
            return jsonify({'error': 'Template not found or file missing'}), 404

       # Load the XLSX template from binary data
        xlsx_file = BytesIO(template.templateFile)
        workbook = load_workbook(xlsx_file)
        worksheet = workbook.active

        # Replace placeholders for descriptions and unit prices
        descriptions = structured_data.get('description', [])
        unit_prices = structured_data.get('unit_price', [])
        quantities = structured_data.get('qty', [])
    
        for i, (desc, qty, price) in enumerate(zip(descriptions, quantities, unit_prices), start=17):
            # Calculate the row range (e.g., row 17–24)
            description_range = f"G{i}:M{i}"  # Description spans columns G to M
            qty_range = f"N{i}:O{i}"         # Quantity spans columns N to O
            price_range = f"P{i}:R{i}"       # Unit Price spans columns P to R

            # Write data into the top-left cells of each range
            worksheet[f"G{i}"] = desc  # Description
            worksheet[f"N{i}"] = qty   # Quantity
            worksheet[f"P{i}"] = price  # Unit Price

            # Merge the cells for each range
            worksheet.merge_cells(description_range)  # Merge cells for Description
            worksheet.merge_cells(qty_range)         # Merge cells for Quantity
            worksheet.merge_cells(price_range)       # Merge cells for Unit Price

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp_xlsx_file:
            tmp_xlsx_filename = tmp_xlsx_file.name
            workbook.save(tmp_xlsx_filename)

        with open(tmp_xlsx_filename, "rb") as xlsx_file:
            xlsx_data = BytesIO(xlsx_file.read())
        os.remove(tmp_xlsx_filename)

        return send_file(
            xlsx_data,
            as_attachment=True,
            download_name="generated_document.xlsx",
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        update_convert_status(2, int(do_id)) #Failed status
        return jsonify({'error': f'Failed to map and generate template: {str(e)}'}), 500


#For words template
# #Step 5.2: Replacing placeholder
# def replace_placeholder_in_document(document, placeholder, value):
#     """
#     Replace placeholders in the document with the given value or remove them if the value is empty.
#     """
#     try:
#         for paragraph in document.paragraphs:
#             if placeholder in paragraph.text:
#                 if value:
#                     paragraph.text = paragraph.text.replace(placeholder, value)
#                 else:
#                     paragraph.text = paragraph.text.replace(placeholder, "")  

#         for table in document.tables:
#             for row in table.rows:
#                 for cell in row.cells:
#                     if placeholder in cell.text:
#                         if value:
#                             cell.text = cell.text.replace(placeholder, value)
#                         else:
#                             cell.text = cell.text.replace(placeholder, "") 
#     except Exception as e:
#         print(f"Error replacing placeholder {placeholder}: {e}")


    
@app.route('/upload_gr_template', methods=['POST'])
@jwt_required()
def upload_gr_template():
    try:
        # Retrieve the user ID from the JWT token
        user_id = get_jwt_identity()
        
        # Check if the file is part of the request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        description = request.form.get('description', '')

        # Validate the file and description
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        if not (file.filename.endswith('.xls') or file.filename.endswith('.xlsx')):
            return jsonify({'error': 'Only XLS and XLSX files are allowed'}), 400

        # Secure the file name and read file data as binary
        filename = secure_filename(file.filename)
        file_data = file.read()  # Read file content as binary

        # Insert into GRTemplate table with createdBy field populated
        new_template = GRTemplate(
            templateFile=file_data,
            fileName=filename,
            desc=description,
            createdBy=user_id  
        )

        # Add and commit to database
        db.session.add(new_template)
        db.session.commit()

        return jsonify({'message': 'Template uploaded successfully!'}), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Database integrity error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to upload template: {str(e)}'}), 500
    

@app.route('/get_gr_templates_desc', methods=['GET'])
@jwt_required()  # Assuming JWT authentication is required
def get_gr_templates_desc():
    try:
        # Query the GRTemplate table to get only the ID and description columns
        templates = db.session.query(GRTemplate.ID, GRTemplate.desc).all()
        
        # Convert the query result to a list of dictionaries
        result = [{"ID": template.ID, "description": template.desc} for template in templates]
        
        return jsonify(result), 200
    except Exception as e:
        print("Error fetching templates:", e)
        return jsonify({"error": "Failed to fetch templates"}), 500
    

@app.route('/get_gr_templates', methods=['GET'])
@jwt_required()
def get_gr_templates():
    try:
        # Join GRTemplate with User to fetch displayName using the foreign key createdBy
        templates = (
            db.session.query(GRTemplate.ID, GRTemplate.fileName, GRTemplate.desc, GRTemplate.templateFile, User.displayName)
            .join(User, GRTemplate.createdBy == User.ID)
            .all()
        )

        # Format the response to include displayName
        result = [
            {
                "ID": template.ID,
                "fileName": template.fileName,
                "desc": template.desc,
                "displayName": template.displayName,  # Include displayName for the frontend
                "templateFile": base64.b64encode(template.templateFile).decode("utf-8")
            }
            for template in templates
        ]

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch templates: {str(e)}"}), 500
    
    
@app.route('/delete_gr_template/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_gr_template(id):
    try:
        template = db.session.query(GRTemplate).filter_by(ID=id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404

        db.session.delete(template)
        db.session.commit()
        return jsonify({'message': 'Template deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete template: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(debug=True)
