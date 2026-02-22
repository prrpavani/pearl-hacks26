"""Quick MongoDB connection debugger. Run with: python debug_mongo.py"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure

load_dotenv()

uri = os.getenv("MONGODB_URI")

# 1. Check if the URI was even loaded
if not uri:
    print("❌ ERROR: MONGODB_URI not found in .env file")
else:
    print(f"Attempting to connect to: {uri.split('@')[-1]}")  # Hide password in logs

client = MongoClient(uri, serverSelectionTimeoutMS=5000)

try:
    # The 'ping' command is necessary to force a connection check
    client.admin.command('ping')
    print("✅ Connected successfully to MongoDB!")
except ConnectionFailure as e:
    print(f"❌ Could not connect to server: {e}")
except OperationFailure as e:
    print(f"❌ Authentication failed or permission denied: {e}")
except Exception as e:
    print(f"❌ An unexpected error occurred: {e}")
