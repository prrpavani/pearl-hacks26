from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from solana.rpc.api import Client
from solders.pubkey import Pubkey
import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SOLANA_PUBLIC_KEY = os.getenv("SOLANA_PUBLIC_KEY", "79d9Hx7f9zX1TFaFvJqCvmug5sQHq6uoJHBxpbzEgPrB")

@app.get("/sol-balance")
def get_sol_balance():
    try:
        client = Client("https://api.devnet.solana.com")
        pubkey = Pubkey.from_string(SOLANA_PUBLIC_KEY)
        balance_resp = client.get_balance(pubkey)
        if hasattr(balance_resp, 'value'):
            sol_balance = balance_resp.value / 10**9
            print(f"Fetched SOL balance: {sol_balance} SOL for {SOLANA_PUBLIC_KEY}")
            return {"balance": sol_balance}
        else:
            print(f"Unexpected response: {balance_resp}")
            return {"balance": "error", "detail": str(balance_resp)}
    except Exception as e:
        print(f"Error fetching SOL balance: {e}")
        return {"balance": "error", "detail": str(e)}
