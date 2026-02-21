import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = "pearlhacks"
TASKS_COLLECTION = "tasks"
SUBMISSIONS_COLLECTION = "task_submissions"

TASK_TTL_MINUTES = int(os.getenv("TASK_TTL_MINUTES", "10"))

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[DB_NAME]


def get_tasks_col():
    return get_db()[TASKS_COLLECTION]


def get_submissions_col():
    return get_db()[SUBMISSIONS_COLLECTION]


# ---------------------------------------------------------------------------
# Index setup — call once at app startup (idempotent)
# ---------------------------------------------------------------------------

async def setup_indexes():
    tasks = get_tasks_col()
    submissions = get_submissions_col()

    # tasks: unique lookup by task_id + TTL auto-cleanup on expires_at
    await tasks.create_index("task_id", unique=True)
    await tasks.create_index("expires_at", expireAfterSeconds=0)

    # submissions: fast leaderboard aggregation + deduplication
    await submissions.create_index("wallet_address")
    await submissions.create_index(
        [("wallet_address", 1), ("task_id", 1)], unique=True
    )


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

async def create_task(
    task_id: str,
    image_url: str,
    options: list[str],
    correct_answer: str,
) -> None:
    """Persists an LLM-generated task. correct_answer is stored server-side only."""
    now = datetime.now(timezone.utc)
    doc = {
        "task_id": task_id,
        "image_url": image_url,
        "options": options,
        "correct_answer": correct_answer,
        "created_at": now,
        "expires_at": now + timedelta(minutes=TASK_TTL_MINUTES),
    }
    await get_tasks_col().insert_one(doc)


async def get_and_delete_task(task_id: str) -> dict | None:
    """
    Atomically fetches and removes a task by task_id.
    Returns the task document, or None if not found / already consumed.
    """
    return await get_tasks_col().find_one_and_delete({"task_id": task_id})


# ---------------------------------------------------------------------------
# Submissions
# ---------------------------------------------------------------------------

async def check_duplicate(wallet_address: str, task_id: str) -> bool:
    """Returns True if this wallet already submitted this task."""
    doc = await get_submissions_col().find_one(
        {"wallet_address": wallet_address, "task_id": task_id}
    )
    return doc is not None


async def store_submission(
    wallet_address: str,
    task_id: str,
    label: str,
    is_correct: bool,
    payout_sol: float,
    tx_signature: str | None,
) -> str:
    """
    Stores a validated task submission. Returns the inserted document id.
    """
    doc = {
        "wallet_address": wallet_address,
        "task_id": task_id,
        "label": label,
        "is_correct": is_correct,
        "payout_sol": payout_sol,
        "tx_signature": tx_signature,
        "submitted_at": datetime.now(timezone.utc),
    }
    result = await get_submissions_col().insert_one(doc)
    return str(result.inserted_id)


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

async def get_leaderboard(limit: int = 10) -> list[dict]:
    """
    Returns wallets ranked by total SOL earned (descending).
    Each entry: {wallet_address, total_sol, tasks_completed}
    """
    pipeline = [
        {"$match": {"is_correct": True}},
        {
            "$group": {
                "_id": "$wallet_address",
                "total_sol": {"$sum": "$payout_sol"},
                "tasks_completed": {"$sum": 1},
            }
        },
        {"$sort": {"total_sol": -1}},
        {"$limit": limit},
        {
            "$project": {
                "_id": 0,
                "wallet_address": "$_id",
                "total_sol": 1,
                "tasks_completed": 1,
            }
        },
    ]
    cursor = get_submissions_col().aggregate(pipeline)
    return [doc async for doc in cursor]


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

async def close_client():
    global _client
    if _client:
        _client.close()
        _client = None
