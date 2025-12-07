import asyncio
from sqlalchemy import text
from database import engine

async def migrate_users():
    async with engine.begin() as conn:
        print("Running schema migration...")
        
        # Add is_admin to users
        print("Checking users.is_admin...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0"))
        
        # Add stripe_customer_id to users
        print("Checking users.stripe_customer_id...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
        
        # Add stripe_payment_id to transactions
        print("Checking transactions.stripe_payment_id...")
        await conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR"))
        
        # Add refunded to jobs (for tracking credit refunds on failed jobs)
        print("Checking jobs.refunded...")
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS refunded INTEGER DEFAULT 0"))
        
        # Add runpod_job_id to jobs (for progress tracking)
        print("Checking jobs.runpod_job_id...")
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS runpod_job_id VARCHAR"))
        
        # Add progress to jobs (0-100)
        print("Checking jobs.progress...")
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0"))
        
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_users())
