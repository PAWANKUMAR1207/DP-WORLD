from supabase import create_client

from config import SUPABASE_KEY, SUPABASE_URL


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_shipments(limit=1000):
    return get_client().table("shipments").select("*").limit(limit).execute().data


def fetch_company_shipments(company_id):
    return (
        get_client()
        .table("shipments")
        .select("*")
        .eq("company_id", company_id)
        .execute()
        .data
    )
