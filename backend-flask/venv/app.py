from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import joinedload
from flask_sqlalchemy import SQLAlchemy
from flask import Flask, jsonify, make_response, request
from flask_cors import CORS
import urllib.parse
from sqlalchemy.orm import Session as DBSession
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from datetime import datetime
from PIL import Image
import openai
import os
from werkzeug.utils import secure_filename
from flask import send_file
from io import BytesIO
import fitz
import spacy
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from docx import Document
import base64
import tempfile
from docx2pdf import convert


app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

connection_string = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-LVNJCDK;"
    "DATABASE=neuroformatterDB;"
    "Trusted_Connection=yes;"
)
app.config['SQLALCHEMY_DATABASE_URI'] = f'mssql+pyodbc:///?odbc_connect={connection_string}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key'  
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  
openai.api_key = os.getenv("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")
jwt = JWTManager(app)

db = SQLAlchemy(app)
Base = automap_base()
nlp = spacy.load("en_core_web_sm")

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
        # Fetch the user and join with the Authority table to get the role description
        user = session_db.query(Account, Authority).join(Authority, Account.authority == Authority.ID).filter(Account.username == auth.get('username')).first()
        
        # Close the session after fetching the user
        session_db.close()

        # Check if the user exists and the password matches
        if user and user.Account.password == auth.get('password'):
            # Get the authority description (role) from the joined Authority table
            authority_desc = user.Authority.desc

            # Create a new token with the user's ID embedded
            access_token = create_access_token(identity=user.Account.ID)
            return jsonify(access_token=access_token, role=authority_desc), 200
        else:
            return jsonify({"msg": "Bad username or password"}), 401
    except Exception as e:
        # Close the session in case of an exception
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
    count = session_db.query(DeliveryOrder).filter(DeliveryOrder.convertStatusId == 2).count()
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
    count = session_db.query(DeliveryOrder).filter(DeliveryOrder.convertStatusId == 3).count()
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
            DeliveryOrder.DOID,
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
            'doid': order.DOID,
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

    
@app.route('/get_goods_received_orders', methods=['GET'])
@jwt_required()
def get_goods_received_orders():
    session = db.session()

    try:
        orders = session.query(
            User.displayName.label('createdBy'),
            GoodsReceivedOrder.GRID,
            DeliveryOrder.DOID.label('doid'),
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
            'grid': order.GRID,
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

        if not all([status, authority, username, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        new_account = Account(
            status=status,
            authority=authority,
            username=username,
            password=password,
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

        # Update the account fields
        account.username = data.get('username', account.username)
        account.password = data.get('password', account.password)
        # Update authority if provided
        authority = data.get('authority')
        if authority is not None:
            account.authority = authority

        # Commit the changes
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

        # Verify that the old password matches
        if account.password != old_password:
            return jsonify({'error': 'Incorrect old password'}), 401

        # Update the password directly
        account.password = new_password
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
    

@app.route('/get_user_password', methods=['GET'])
@jwt_required()
def get_user_password():
    session = db.session()
    try:
        # Get the user ID from the token
        user_id = get_jwt_identity()

        # Fetch the password from the Account table using the user's ID
        result = session.query(Account.password).join(User, User.accountID == Account.ID).filter(User.ID == user_id).first()

        # If no password is found, return an error response
        if not result:
            return jsonify({'error': 'User not found or password not available'}), 404

        # Return the password in the response (in a real-world scenario, you wouldn't expose the password like this)
        return jsonify({'password': result[0]}), 200

    except Exception as e:
        # Handle errors, rollback session, and log the exception
        session.rollback()
        return jsonify({'error': f'Failed to fetch password: {str(e)}'}), 500

    finally:
        session.close()


@app.route('/get_history', methods=['GET'])
@jwt_required()
def get_history():
    session = db.session()

    try:
        # Get the user ID from the JWT token
        user_id = get_jwt_identity()

        # Execute the query to get delivery orders with their associated goods received orders
        results = session.query(
            DeliveryOrder.DOID,
            DeliveryOrder.documentName.label('DO_document_Name'),
            func.coalesce(GoodsReceivedOrder.GRID, '-').label('GRID'),
            func.coalesce(GoodsReceivedOrder.documentName, '-').label('GR_document_Name'),
            GoodsReceivedOrder.dateConverted,
            func.coalesce(ConvertStatus.desc, 'Failed').label('status'),
            DeliveryOrder.dateCreated.label('Uploaded_Date')
        ).outerjoin(GoodsReceivedOrder, 
                    (GoodsReceivedOrder.deliverOrderId == DeliveryOrder.ID) & 
                    (GoodsReceivedOrder.createdBy == user_id)
        ).outerjoin(ConvertStatus, ConvertStatus.ID == DeliveryOrder.convertStatusId
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

        # Retrieve DOID from form data, default to None if not provided
        doid = request.form.get('DOID') or None

        # Loop over the uploaded files and add each one to the database
        for key in request.files:
            file = request.files[key]
            file_data = file.read()  # Read the file content as bytes
            
            # Insert into the DeliveryOrder table
            delivery_order = DeliveryOrder(
                uploadBy=user_id,
                convertStatusId=1,
                DOID=doid,  # Set DOID to None if not provided
                DOfile=file_data,
                documentName=file.filename,
                dateCreated=datetime.utcnow()
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


def extract_text_from_pdf(file):
    text = ""
    with fitz.open(stream=file.read(), filetype="pdf") as pdf:
        for page_num in range(pdf.page_count):
            page = pdf[page_num]
            text += page.get_text("text")
    return text


@app.route('/process_pdf', methods=['POST'])
def process_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file and file.filename.endswith('.pdf'):
        # Step 1: Extract text from PDF
        extracted_text = extract_text_from_pdf(file)

        # Step 2: Use spaCy for NLP processing on the extracted text
        doc = nlp(extracted_text)
        
        # Extract entities and organize them as structured data
        structured_data = {}
        for ent in doc.ents:
            structured_data[ent.label_] = structured_data.get(ent.label_, []) + [ent.text]
        
        return jsonify({
            'message': 'Text extracted and processed with NLP successfully!',
            'structured_data': structured_data
        }), 200

    else:
        return jsonify({'error': 'Invalid file type. Only PDF files are allowed.'}), 400
    

@app.route('/map_to_template', methods=['POST'])
@jwt_required()
def map_to_template():
    try:
        # Get template ID and structured data from the request
        data = request.get_json()
        template_id = data.get('template_id')
        structured_data = data.get('structured_data')
        
        if not template_id or not structured_data:
            return jsonify({'error': 'Template ID and structured data are required'}), 400

        # Fetch template from the database
        template = db.session.query(GRTemplate).filter_by(ID=template_id).first()
        if not template or not template.templateFile:
            return jsonify({'error': 'Template not found or file missing'}), 404

        # Load the DOCX template from binary data
        docx_file = BytesIO(template.templateFile)
        document = Document(docx_file)

        # Replace placeholders in the document with structured data
        for key, values in structured_data.items():
            placeholder = f"{{{{{key}}}}}"
            for paragraph in document.paragraphs:
                if placeholder in paragraph.text:
                    for value in values:
                        paragraph.text = paragraph.text.replace(placeholder, value)
            # Handle placeholders within tables if the template has them
            for table in document.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if placeholder in cell.text:
                            for value in values:
                                cell.text = cell.text.replace(placeholder, value)

        # Save the modified DOCX to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp_docx_file:
            tmp_docx_filename = tmp_docx_file.name
            document.save(tmp_docx_filename)

        # Convert the modified DOCX to PDF
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf_file:
            tmp_pdf_filename = tmp_pdf_file.name
        convert(tmp_docx_filename, tmp_pdf_filename)

        # Read the generated PDF and send it as a response
        with open(tmp_pdf_filename, "rb") as pdf_file:
            pdf_data = BytesIO(pdf_file.read())

        # Clean up temporary files
        os.remove(tmp_docx_filename)
        os.remove(tmp_pdf_filename)

        return send_file(
            pdf_data,
            as_attachment=True,
            download_name="generated_document.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({'error': f'Failed to map and generate template: {str(e)}'}), 500

    

@app.route('/generate_pdf', methods=['POST'])
@jwt_required()
def generate_pdf():
    try:
        # Get mapped data from the request
        data = request.get_json()
        mapped_data = data.get("mappedData")
        
        if not mapped_data:
            return jsonify({'error': 'No mapped data provided'}), 400

        # Set up a BytesIO buffer for the PDF
        pdf_buffer = BytesIO()

        # Create the PDF canvas
        pdf_canvas = canvas.Canvas(pdf_buffer, pagesize=letter)
        pdf_canvas.setTitle("Generated Document")

        # Start writing content to the PDF
        pdf_canvas.setFont("Helvetica", 12)
        pdf_canvas.drawString(72, 750, "Generated Document")
        
        y_position = 720  # Initial position

        for field, values in mapped_data.items():
            for value in values:
                pdf_canvas.drawString(72, y_position, f"{field}: {value}")
                y_position -= 20  # Move down for each entry

                # Check if the page needs to be continued
                if y_position < 72:  # Avoid going too low on the page
                    pdf_canvas.showPage()
                    pdf_canvas.setFont("Helvetica", 12)
                    y_position = 750  # Reset position on new page

        # Save and close the PDF canvas
        pdf_canvas.save()
        pdf_buffer.seek(0)

        # Define a filename for the PDF
        pdf_filename = "generated_document.pdf"

        # Send the PDF as a response
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=pdf_filename,
            mimetype='application/pdf'
        )

    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500


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
        
        # Secure the file name and read file data as binary
        filename = secure_filename(file.filename)
        file_data = file.read()  # Read file content as binary
        
        # Insert into GRTemplate table
        new_template = GRTemplate(
            templateFile=file_data,
            fileName=filename,
            desc=description
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
        templates = db.session.query(GRTemplate.ID, GRTemplate.fileName, GRTemplate.desc, GRTemplate.templateFile).all()
        result = [
            {
                "ID": template.ID,
                "fileName": template.fileName,
                "desc": template.desc,
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
