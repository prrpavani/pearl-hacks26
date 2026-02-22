from solana.rpc.api import Client
from solders.pubkey import Pubkey

RPC_URL = "https://api.devnet.solana.com"

def get_sol_balance(pubkey_str: str) -> float:
    client = Client(RPC_URL)
    pubkey = Pubkey.from_string(pubkey_str)
    balance_resp = client.get_balance(pubkey)

    if hasattr(balance_resp, "value"):
        return balance_resp.value / 10**9

    raise Exception(f"Unexpected RPC response: {balance_resp}")