import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import connect_db, get_database

async def check():
    await connect_db()
    db = get_database()
    docs = await db.users.find({"is_demo": True}, {"name": 1, "specialty": 1, "is_demo": 1, "role": 1}).to_list(20)
    if not docs:
        print("NO demo doctors found — re-running seed...")
        return False
    for d in docs:
        print("  OK:", d.get("name"), "|", d.get("specialty"), "| role=", d.get("role"), "| is_demo=", d.get("is_demo"))
    return True

asyncio.run(check())
