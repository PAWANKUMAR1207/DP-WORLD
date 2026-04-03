from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

LOW_RISK = 30
MEDIUM_RISK = 70

WEIGHTS = {
    "physics": 0.20,
    "document": 0.25,
    "behavior": 0.20,
    "network": 0.20,
    "scoring": 0.15,
}
