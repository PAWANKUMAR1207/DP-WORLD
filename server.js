require("dotenv").config();
const path = require("path");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

function createSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (_req, res) => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    res.json({
      ok: true,
      message: "Supabase connection successful",
      url: supabaseUrl,
      bucketCount: data.length,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message || "Supabase connection failed",
      checkedAt: new Date().toISOString(),
    });
  }
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
