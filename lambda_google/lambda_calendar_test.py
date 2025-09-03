from lambda_function import lambda_handler

# === TEST CASES (only call when uncommented below)
def get_all_test(): return lambda_handler({ "action": "get" })
def get_month_test(): return lambda_handler({ "action": "get", "month": "October" })  # Future
def add_test(): return lambda_handler({ "action": "add", "event": {
    "summary": "TEMP: Brainstorm with Darren",
    "start": { "dateTime": "2025-09-04T10:00:00", "timeZone": "Europe/London" },
    "end": { "dateTime": "2025-09-04T11:00:00", "timeZone": "Europe/London" }
}})
def find_test(): return lambda_handler({ "action": "find", "term": "brainstorm" })





# =====================
# === PRINT RESULTS ===
# =====================


# print("\n--- ➕ Add Event ---", get_all_test())
# print("\n--- 🔍 All Events ---", get_month_test())
# print("\n--- 🎯 Found Event ---", find_test())
print("\n--- 🔍 Events in October ---", add_test())
