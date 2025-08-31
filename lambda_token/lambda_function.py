import json
import os

# 🟢 Pull secrets from environment
SECRET_WORD = os.environ["SECRET_WORD"]
UI_TOKEN = os.environ["UI_TOKEN"]
API_TOKEN = os.environ["API_TOKEN"]

def lambda_handler(event, context):
    try:
        # 🔍 Parse the body from API Gateway
        body = json.loads(event.get("body", "{}"))
        secret = body.get("secretWord", "").strip()

        # 🔐 Secret match check
        if secret == SECRET_WORD:
            return {
                "statusCode": 200,
                "headers": { "Content-Type": "application/json" },
                "body": json.dumps({
                    "userToken": UI_TOKEN,
                    "apiToken": API_TOKEN
                })
            }

        # ❌ Bad secret
        return {
            "statusCode": 401,
            "body": json.dumps({ "error": "Invalid secret" })
        }

    except Exception as e:
        # 🔥 Unexpected error
        return {
            "statusCode": 500,
            "body": json.dumps({ "error": str(e) })
        }
