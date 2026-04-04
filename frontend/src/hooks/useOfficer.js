import { useState, useEffect, useCallback } from "react";

const defaultOfficerProfile = {
  full_name: "Officer A. Rahman",
  role_title: "Customs Risk Officer",
  badge_id: "ID CR-4172",
  email: "arahman@ghostship.local",
  terminal: "Terminal 4",
  shift_name: "Morning Shift",
  photo_url: null,
};

export function useOfficer() {
  const [profile, setProfile] = useState(defaultOfficerProfile);
  const [form, setForm] = useState(defaultOfficerProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadOfficerProfile() {
      try {
        const response = await fetch("/api/officer-profile");
        const payload = await response.json();
        if (payload?.ok && payload.profile) {
          setProfile(payload.profile);
          setForm(payload.profile);
        }
      } catch {
        // Keep local defaults if profile service is unavailable.
      }
    }

    loadOfficerProfile();
  }, []);

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }, []);

  const saveProfile = useCallback(async (photoFile) => {
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== "photo_url") {
          formData.append(key, value ?? "");
        }
      });
      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const response = await fetch("/api/officer-profile", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || "Could not save officer profile");
      }

      setProfile(payload.profile);
      setForm(payload.profile);
      setMessage("Officer profile updated successfully.");
    } catch (err) {
      setMessage(err.message || "Could not save officer profile");
    } finally {
      setSaving(false);
    }
  }, [form]);

  return {
    profile,
    form,
    saving,
    message,
    updateField,
    saveProfile,
  };
}
