import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import init_db
from backend.config import settings

async def main():
    print(f"--- DATABASE INITIALIZATION ---")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Target URL: {settings.DATABASE_URL.split('@')[-1] if settings.DATABASE_URL else 'None'}")
    
    confirm = input("\nProceed with schema creation? (y/n): ")
    if confirm.lower() != 'y':
        print("Aborted.")
        return

    try:
        await init_db()
        print("\n[SUCCESS] Database tables created successfully.")
    except Exception as e:
        print(f"\n[ERROR] Failed to initialize database: {e}")

if __name__ == "__main__":
    asyncio.run(main())
