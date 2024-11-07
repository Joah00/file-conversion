import os
import urllib.parse

# Database connection
connection_string = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=DESKTOP-LVNJCDK;"
    "DATABASE=neuroformatterDB;"
    "Trusted_Connection=yes;"
)

SQLALCHEMY_DATABASE_URI = f'mssql+pyodbc:///?odbc_connect={connection_string}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# JWT Secret Key
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
JWT_ACCESS_TOKEN_EXPIRES = False