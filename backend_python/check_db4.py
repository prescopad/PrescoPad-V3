import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable is required")
    client = AsyncIOMotorClient(uri)
    db = client["prescopad"]
    doctors = await db.doctors.find().to_list(10)
    for d in doctors:
        cid = d.get("clinic_id")
        print("Doctor:", d.get("name"), "Clinic ID:", cid)
        if cid:
            clinic = await db.clinics.find_one({"_id": ObjectId(cid)})
            print("Clinic DB Name:", clinic.get("name") if clinic else "NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check())
