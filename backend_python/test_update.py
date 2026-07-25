import os
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def test_update():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable is required")
    client = AsyncIOMotorClient(uri)
    db = client["prescopad"]
    
    # Let's find Karan
    karan = await db.doctors.find_one({"name": "Karan"})
    if not karan:
        print("Karan not found")
        return
        
    print("Found Karan, clinic_id:", karan.get("clinic_id"))
    
    clinic_id = karan.get("clinic_id")
    if clinic_id:
        # Check current clinic
        clinic = await db.clinics.find_one({"_id": ObjectId(clinic_id)})
        print("Before update:", clinic.get("name") if clinic else "NOT FOUND")
        
        # Simulate update_one
        clinic_update = {"name": "Karan's Awesome Clinic"}
        res = await db.clinics.update_one(
            {"_id": ObjectId(clinic_id)},
            {"$set": clinic_update}
        )
        print("Modified count:", res.modified_count)
        
        # Check after update
        clinic_after = await db.clinics.find_one({"_id": ObjectId(clinic_id)})
        print("After update:", clinic_after.get("name"))

if __name__ == "__main__":
    asyncio.run(test_update())
