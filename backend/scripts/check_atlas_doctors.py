import asyncio, sys, os, bcrypt
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Force Atlas URI
os.environ['MONGODB_URI'] = 'mongodb+srv://medai:Medaiteja123@cluster0.mqzrp.mongodb.net/medai?retryWrites=true&w=majority&appName=Cluster0'
os.environ['DB_NAME'] = 'medai'

from config.database import connect_db, get_database

async def check():
    await connect_db()
    db = get_database()
    docs = await db.users.find({'is_demo': True}, {'name': 1, 'email': 1, 'password_hash': 1}).to_list(10)
    if not docs:
        print('NO demo doctors found in Atlas DB')
        return
    for d in docs:
        h = d.get('password_hash', '')
        has_hash = bool(h)
        if has_hash:
            ok = bcrypt.checkpw(b'Doctor@123', h.encode('utf-8'))
        else:
            ok = False
        name = d.get('name', '?')
        print(f'  {name:30s}  hash_set={has_hash}  password_ok={ok}')

asyncio.run(check())
