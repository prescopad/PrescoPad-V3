import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable is required")
    client = AsyncIOMotorClient(uri)
    db = client["prescopad"]
    clinics = await db.clinics.find().to_list(10)
    for c in clinics:
        print(c.get("name"))

if __name__ == "__main__":
    asyncio.run(check())
