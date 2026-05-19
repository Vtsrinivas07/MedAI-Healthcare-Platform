import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import connect_db, get_database

async def check():
    await connect_db()
    db = get_database()
    sessions = await db.chat_sessions.find({}).sort("updated_at", -1).to_list(5)
    print(f"Total sessions in DB: {len(sessions)}")
    for s in sessions[:3]:
        sid = str(s["_id"])
        title = s.get("title", "?")
        updated = s.get("updated_at")
        msgs = s.get("messages", [])
        print(f"  id={sid}  title={title!r}  updated_at_type={type(updated).__name__}  msgs={len(msgs)}")
        if msgs:
            m = msgs[0]
            ts = m.get("timestamp")
            print(f"    first_msg_timestamp_type={type(ts).__name__}  role={m.get('role')}  content={str(m.get('content',''))[:40]!r}")

asyncio.run(check())
