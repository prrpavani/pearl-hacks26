"""
Solana Devnet payout service.

Sends a fixed micro-payout from the app's Master Wallet to the user's
wallet address whenever they complete a labeling task.

Dependencies:
    pip install solana solders

Environment variables:
    MASTER_WALLET_PRIVATE_KEY  – base58-encoded private key of the funding wallet
    PAYOUT_AMOUNT_SOL          – amount to send per task (default: 0.001 SOL)
"""

import os
import asyncio
from dotenv import load_dotenv

from solders.keypair import Keypair  # type: ignore
from solders.pubkey import Pubkey  # type: ignore
from solders.system_program import TransferParams, transfer  # type: ignore
from solders.transaction import Transaction  # type: ignore
from solders.message import Message  # type: ignore
from solana.rpc.async_api import AsyncClient  # type: ignore
from solana.rpc.commitment import Confirmed  # type: ignore
from solana.rpc.types import TxOpts  # type: ignore

load_dotenv()

DEVNET_RPC = "https://api.devnet.solana.com"
LAMPORTS_PER_SOL = 1_000_000_000

_PAYOUT_SOL = float(os.getenv("PAYOUT_AMOUNT_SOL", "0.001"))
PAYOUT_LAMPORTS = int(_PAYOUT_SOL * LAMPORTS_PER_SOL)


def _load_master_keypair() -> Keypair:
    raw = os.getenv("MASTER_WALLET_PRIVATE_KEY", "")
    if not raw:
        raise EnvironmentError("MASTER_WALLET_PRIVATE_KEY is not set")
    # Accept a comma-separated list of bytes (uint8 array) or a base58 string
    if raw.startswith("["):
        import json
        byte_list = json.loads(raw)
        return Keypair.from_bytes(bytes(byte_list))
    return Keypair.from_base58_string(raw)


async def send_devnet_sol(recipient_address: str) -> str:
    """
    Sends PAYOUT_LAMPORTS from the master wallet to `recipient_address` on Devnet.
    Returns the transaction signature string.
    """
    master = _load_master_keypair()
    recipient = Pubkey.from_string(recipient_address)

    async with AsyncClient(DEVNET_RPC) as client:
        # Fetch a fresh blockhash
        blockhash_resp = await client.get_latest_blockhash(commitment=Confirmed)
        recent_blockhash = blockhash_resp.value.blockhash

        # Build transfer instruction
        ix = transfer(
            TransferParams(
                from_pubkey=master.pubkey(),
                to_pubkey=recipient,
                lamports=PAYOUT_LAMPORTS,
            )
        )

        # Build and sign transaction
        msg = Message.new_with_blockhash(
            [ix], master.pubkey(), recent_blockhash
        )
        tx = Transaction([master], msg, recent_blockhash)

        # Send and confirm (skip_preflight avoids BlockhashNotFound on Devnet)
        resp = await client.send_transaction(tx, opts=TxOpts(skip_preflight=True))
        sig = resp.value  # Signature object — keep as-is for confirm_transaction

        # Wait for confirmation (non-blocking poll)
        await client.confirm_transaction(sig, commitment=Confirmed)

    return str(sig)


# ---------------------------------------------------------------------------
# Quick smoke-test:  python solana_service.py <recipient_address>
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python solana_service.py <recipient_pubkey>")
        sys.exit(1)

    sig = asyncio.run(send_devnet_sol(sys.argv[1]))
    print(f"Transaction confirmed: {sig}")
    print(f"Explorer: https://explorer.solana.com/tx/{sig}?cluster=devnet")
