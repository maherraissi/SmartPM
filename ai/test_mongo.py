import motor.motor_asyncio
import asyncio

async def main():
  client = motor.motor_asyncio.AsyncIOMotorClient('mongodb+srv://raissimaher:melek@cluster0.ihmh6wl.mongodb.net/smartpm?retryWrites=true&w=majority')
  db = client.smartpm
  cols = await db.list_collection_names()
  print("Collections:", cols)

asyncio.run(main())
