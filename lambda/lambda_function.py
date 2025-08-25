import openai
import os
import json

def lambda_handler(event, context):
    print("🔵 Event received:", event)

    # Parse input JSON
    body = json.loads(event.get("body", "{}"))
    messages = body.get("messages", [])

    # Init OpenAI client
    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # Call OpenAI API
    response = client.chat.completions.create(
        model="gpt-4",  # or "gpt-3.5-turbo"
        messages=messages
    )

    reply = response.choices[0].message.content
    print("🧠 GPT Reply:", reply)

    # Return the reply
    return {
        "statusCode": 200,
        "headers": { "Content-Type": "application/json" },
        "body": json.dumps({ "reply": reply })
    }
