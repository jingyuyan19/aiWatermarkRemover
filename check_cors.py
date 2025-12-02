import boto3
import requests
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

def check_cors():
    print("Checking R2 CORS Configuration...")
    
    # 1. Check Bucket CORS via boto3
    s3 = boto3.client(
        's3',
        endpoint_url=os.getenv('S3_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
    )
    
    bucket_name = os.getenv('BUCKET_NAME')
    
    try:
        cors = s3.get_bucket_cors(Bucket=bucket_name)
        print("\n✅ Current CORS Rules:")
        for rule in cors['CORSRules']:
            print(f"  AllowedOrigins: {rule.get('AllowedOrigins')}")
            print(f"  AllowedMethods: {rule.get('AllowedMethods')}")
            print(f"  AllowedHeaders: {rule.get('AllowedHeaders')}")
            print(f"  MaxAgeSeconds: {rule.get('MaxAgeSeconds')}")
    except Exception as e:
        print(f"\n❌ Error getting CORS rules: {e}")

    # 2. Test Preflight Request via requests
    print("\nTesting Preflight Request...")
    
    # Generate a presigned URL first
    try:
        key = "test-cors.txt"
        url = s3.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )
        
        # Simulate OPTIONS request from browser
        headers = {
            'Origin': 'https://ai-watermark-remover-phi.vercel.app',
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'content-type'
        }
        
        response = requests.options(url, headers=headers)
        
        print(f"\nPreflight Response Code: {response.status_code}")
        print("Response Headers:")
        for k, v in response.headers.items():
            if 'Access-Control' in k:
                print(f"  {k}: {v}")
                
        if response.status_code == 200 and 'Access-Control-Allow-Origin' in response.headers:
            print("\n✅ CORS Preflight Passed!")
        else:
            print("\n❌ CORS Preflight Failed!")
            
    except Exception as e:
        print(f"\n❌ Error testing preflight: {e}")

if __name__ == "__main__":
    check_cors()
