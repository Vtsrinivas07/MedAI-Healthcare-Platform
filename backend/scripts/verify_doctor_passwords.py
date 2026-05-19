import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bcrypt
from config.database import connect_db, get_database

async def check():
    await connect_db()
    db = get_database()
    docs = await db.users.find({"is_demo": True}, {"name": 1, "email": 1, "password_hash": 1}).to_list(10)
    for d in docs:
        h = d.get("password_hash", "")
        has_hash = bool(h)
        if has_hash:
            ok = bcrypt.checkpw(b"Doctor@123", h.encode("utf-8"))
        else:
            ok = False
        print(f"  {d['name']:30s}  hash_set={has_hash}  password_ok={ok}")

asyncio.run(check())
