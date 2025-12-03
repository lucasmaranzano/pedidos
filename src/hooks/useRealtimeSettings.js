import { useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Suscribe a cambios en app_settings y ejecuta callback.
 */
export function useRealtimeSettings(onChange) {
  useEffect(() => {
    const channel = supabase
      .channel("app-settings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}
