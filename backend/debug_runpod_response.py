import runpod
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

api_key = os.getenv("RUNPOD_API_KEY")
endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID")

print("--- RunPod Response Debugger ---")
print(f"API Key present: {bool(api_key)}")
print(f"Endpoint ID: {endpoint_id}")

if not api_key or not endpoint_id:
    print("ERROR: Missing RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID in .env file.")
    exit(1)

runpod.api_key = api_key

try:
    print("\nSending test request to RunPod...")
    # Sending a dummy request just to see the response structure
    # We do not expect this to succeed in meaningful processing, 
    # we just want to see what .run() returns immediately.
    response = runpod.Endpoint(endpoint_id).run({
        "input": {
            "test": "true",
            "job_id": "debug-test-123"
        }
    })

    print("\n--- RESPONSE RECEIVED ---")
    print(f"Type: {type(response)}")
    
    if hasattr(response, "__dict__"):
        print(f"Attributes: {response.__dict__}")
    
    print(f"Raw Content: {response}")
    
    if isinstance(response, dict):
        print(f"Keys: {list(response.keys())}")
        if "id" in response:
            print(f"ID found in dict: {response['id']}")
    else:
        if hasattr(response, "id"):
             print(f"ID found as attribute: {response.id}")

    print("\n-------------------------")

except Exception as e:
    print(f"\nCRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
