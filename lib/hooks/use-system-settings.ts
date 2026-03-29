"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type Deserializer<T> = (raw: Record<string, string>) => T;
type Serializer<T> = (state: T) => Record<string, string>;

interface UseSystemSettingsOptions<T> {
  keys: string[];
  defaults: T;
  deserialize: Deserializer<T>;
  serialize: Serializer<T>;
}

interface UseSystemSettingsReturn<T> {
  settings: T;
  setSettings: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  saving: boolean;
  save: () => Promise<boolean>;
  reload: () => Promise<void>;
}

/**
 * Generic hook for loading and saving system_settings rows.
 * Replaces the repeated fetch/upsert/loading/saving boilerplate
 * found across every admin settings page.
 */
export function useSystemSettings<T>(options: UseSystemSettingsOptions<T>): UseSystemSettingsReturn<T> {
  const { keys, defaults, deserialize, serialize } = options;
  const [settings, setSettings] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", keys);

      if (data) {
        const raw: Record<string, string> = {};
        data.forEach((item: { setting_key: string; setting_value: string | null }) => {
          if (item.setting_value != null) {
            raw[item.setting_key] = item.setting_value;
          }
        });
        setSettings(deserialize(raw));
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const serialized = serialize(settings);
      const rows = Object.entries(serialized).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      const { error } = await supabase
        .from("system_settings")
        .upsert(rows, { onConflict: "setting_key" });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving system settings:", error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings, serialize]);

  return { settings, setSettings, loading, saving, save, reload };
}
