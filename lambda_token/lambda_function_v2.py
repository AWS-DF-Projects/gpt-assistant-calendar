import json, os

# 🔐 Env
SECRET_WORD = os.environ["SECRET_WORD"]
UI_TOKEN    = os.environ["UI_TOKEN"]
API_TOKEN   = os.environ["API_TOKEN"]

# ✅ Allowed origins (dev + prod)
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://localhost:5174",
    "https://gpt-assistant.darrenfawcett.com",
}

ALLOWED_HEADERS = "content-type, authorization, x-access-token"
ALLOWED_METHODS = "POST,OPTIONS"

def get_origin(event):
    hdrs = event.get("headers") or {}
    # headers may be lower/upper depending on API Gateway
    return hdrs.get("origin") or hdrs.get("Origin") or "*"

def cors_headers(origin):
    # echo origin only if whitelisted; else block
    if origin in ALLOWED_ORIGINS:
        allow = origin
    else:
        allow = "https://gpt-assistant.darrenfawcett.com"  # or "*" during dev
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        # Optional: cache preflight 1 hour
        "Access-Control-Max-Age": "3600",
    }

def resp(event, status, body_dict):
    return {
        "statusCode": status,
        "headers": cors_headers(get_origin(event)),
        "body": json.dumps(body_dict),
    }

def is_options(event):
    # HTTP API v2 style
    method = (event.get("requestContext", {}).get("http", {}).get("method")
              or event.get("httpMethod")  # REST fallback
              or "").upper()
    return method == "OPTIONS"

def lambda_handler(event, context):
    # Preflight handled here (harmless even if API-level CORS is on)
    if is_options(event):
        return {
            "statusCode": 200,
            "headers": cors_headers(get_origin(event)),
            "body": "OK",
        }

    try:
        body = json.loads(event.get("body") or "{}")
        secret = (body.get("secretWord") or "").strip()

        if secret == SECRET_WORD:
            return resp(event, 200, {
                "userToken": UI_TOKEN,
                "apiToken": API_TOKEN
            })

        return resp(event, 401, {"error": "Invalid secret"})

    except Exception as e:
        # Log in CW, don’t leak details in prod
        print("❌ /token error:", repr(e))
        return resp(event, 500, {"error": "Server error"})
