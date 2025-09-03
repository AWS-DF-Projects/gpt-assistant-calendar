import openai
import os
import json
import time

# Init OpenAI client
client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
print(f"🔍 Lambda cold start at: {time.time()}")


def lambda_handler(event, context):
    print("🔵 Event received:", event)

    path = event.get("requestContext", {}).get("http", {}).get("path", "")
    print("📂 Path:", path)

    # ✅ Fast warm-up ping (no OpenAI call)
    if path.endswith("/ping"):
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"status": "warm"})
        }

    # ✅ Normal chat flow
    body = json.loads(event.get("body", "{}"))
    user_messages = body.get("messages", [])

    # ✅ Inject system message at the start
    messages = [
        {
            "role": "system",
            "content": "You are kAI, a personal assistant designed by Darren Fawcett. including adding calendar events, summarizing thoughts, and giving reminders — all while keeping things light-hearted and human. Speak clearly. Be brief. Inject clever humor where appropriate. Use emoji sparingly but effectively. Prioritize clarity and calmness. When writing calendar events, keep them useful but with a friendly tone.If a user asks you to remember something, summarize it smartly and save it."
        },
        *user_messages
    ]

    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )

    reply = response.choices[0].message.content
    print("🧠 GPT Reply:", reply)

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"reply": reply})
    }
