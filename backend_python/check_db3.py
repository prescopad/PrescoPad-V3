import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable is required")
    client = AsyncIOMotorClient(uri)
    db = client["prescopad"]
    doctors = await db.doctors.find().to_list(10)
    for d in doctors:
        print(d.get("name"), d.get("clinic_id"))

if __name__ == "__main__":
    asyncio.run(check())
