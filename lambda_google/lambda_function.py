import json
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import datetime

# === Scopes and paths ===
SCOPES = ['https://www.googleapis.com/auth/calendar']
CREDENTIALS_PATH = 'credentials.json'
TOKEN_PATH = 'token.json'


# === Init Calendar Service ===
def get_specific_event(search_term):
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('calendar', 'v3', credentials=creds)

    now = datetime.datetime.utcnow().isoformat() + 'Z'
    max_time = (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat() + 'Z'

    events_result = service.events().list(
        calendarId='primary',
        timeMin=now,
        timeMax=max_time,
        maxResults=50,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get("items", [])
    events = [e for e in events if e.get("eventType") != "birthday"]

    for event in events:
        if search_term.lower() in event.get("summary", "").lower():
            return event

    return None




# === GET Function ===
def get_upcoming_events(month: str = None):
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('calendar', 'v3', credentials=creds)

    now = datetime.datetime.utcnow()

    # 👉 Specific month?
    if month:
        try:
            # Accepts formats like "October", "2025-12", etc.
            parsed_month = datetime.datetime.strptime(month, "%B")  # "October"
            year = now.year
        except ValueError:
            try:
                parsed_month = datetime.datetime.strptime(month, "%Y-%m")  # "2025-12"
                year = parsed_month.year
            except ValueError:
                raise ValueError("Month format must be like 'October' or '2025-12'")

        start_date = datetime.datetime(year, parsed_month.month, 1)
        # Get the next month and subtract a day to get last day of the selected month
        if parsed_month.month == 12:
            end_date = datetime.datetime(year + 1, 1, 1)
        else:
            end_date = datetime.datetime(year, parsed_month.month + 1, 1)

    else:
        # 👉 Default: next 30 days
        start_date = now
        end_date = now + datetime.timedelta(days=30)

    time_min = start_date.isoformat() + 'Z'
    time_max = end_date.isoformat() + 'Z'

    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        maxResults=50,
        singleEvents=True,
        orderBy='startTime'
    ).execute()

    events = events_result.get('items', [])
    events = [e for e in events if e.get("eventType") != "birthday"]

    return events


# === ADD Function ===
def add_event_to_calendar(event_payload):
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    service = build('calendar', 'v3', credentials=creds)

    created_event = service.events().insert(
        calendarId='primary',
        body=event_payload
    ).execute()
    return created_event

# === FORMAT Function ===
def format_event_summary(event, details=False):
    summary = event.get("summary", "No title")
    start = event.get("start", {}).get("dateTime", "No start time")
    end = event.get("end", {}).get("dateTime", "No end time")

    basic = f"📅 Event: **{summary}**\n🕙 From: {start}\n🕚 To: {end}"

    if not details:
        return basic

    # Add more only if details=True
    location = event.get("location", "No location provided")
    description = event.get("description", "No agenda or notes.")
    guests = [a.get("email") for a in event.get("attendees", [])]
    guests_str = "\n👥 Guests:\n" + "\n".join(f"• {g}" for g in guests) if guests else ""

    return f"""{basic}
📍 Location: {location}
📝 Agenda:\n{description}{guests_str}"""



# ============================================
# === Lambda Handler (or local test entry) ===
# ============================================

def lambda_handler(event, context=None):
    print("🧠 Event Received:", event)

    action = event.get('action')  # 'get', 'add', or 'find'

    if action == 'get':
        events = get_upcoming_events(event.get("month"))
        return {
            "statusCode": 200,
            "body": json.dumps(events, indent=2)
        }

    elif action == "add":
        event_data = event.get("event", {})
        if not event_data:
            return {"statusCode": 400, "body": "Missing event payload"}

        # 🔍 Auto-color annual leave events green (colorId 10)
        summary = event_data.get("summary", "").lower()
        if "annual leave" in summary and "colorId" not in event_data:
            event_data["colorId"] = "10"

        created_event = add_event_to_calendar(event_data)
        return {
            "statusCode": 200,
            "body": json.dumps(created_event, indent=2)
        }

    elif action == 'find':
        term = event.get('term')
        if not term:
            return {"statusCode": 400, "body": "Missing search term"}
        result = get_specific_event(term)
        if result:
            formatted = format_event_summary(result, details=True)
            return {
                "statusCode": 200,
                "body": json.dumps({"raw": result, "formatted": formatted}, indent=2)
            }

    return {
        "statusCode": 400,
        "body": "Invalid action"
    }
