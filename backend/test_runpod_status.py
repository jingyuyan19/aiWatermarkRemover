
import os
import sys
import asyncio
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_status(job_id: str):
    api_key = os.getenv("RUNPOD_API_KEY")
    endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID")
    
    if not api_key or not endpoint_id:
        print("Error: RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set.")
        return

    url = f"https://api.runpod.ai/v2/{endpoint_id}/status/{job_id}"
    print(f"Querying: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            print(f"Status Code: {resp.status_code}")
            print("--- RAW RESPONSE START ---")
            print(resp.text)
            print("--- RAW RESPONSE END ---")
            
            if resp.status_code == 200:
                data = resp.json()
                print("\nParsed Fields:")
                print(f"Status: {data.get('status')}")
                print(f"Messages: {data.get('messages')}")
                print("\nFull JSON Keys:", list(data.keys()))
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_runpod_status.py <runpod_job_id>")
        sys.exit(1)
        
    job_id = sys.argv[1]
    asyncio.run(check_status(job_id))
