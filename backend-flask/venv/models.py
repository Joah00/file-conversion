from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.ext.automap import automap_base
from app import db  # Make sure to import the SQLAlchemy instance from your app

Base = automap_base()

def reflect_tables():
    Base.prepare(db.engine, reflect=True)

    # Accessing the classes mapped to the existing database tables
    return Base.classes
