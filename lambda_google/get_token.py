# auth_test.py
from google_auth_oauthlib.flow import InstalledAppFlow
import os

# ✅ Full access to calendar (read + write)
SCOPES = ['https://www.googleapis.com/auth/calendar']

flow = InstalledAppFlow.from_client_secrets_file(
    'credentials.json', SCOPES)

creds = flow.run_local_server(port=0)

# Save the new token
with open('token.json', 'w') as token:
    token.write(creds.to_json())

print("✅ New token.json created!")
print("🔁 Refresh Token present?", "refresh_token" in creds.to_json())
