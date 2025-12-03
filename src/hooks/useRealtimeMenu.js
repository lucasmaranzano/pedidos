// src/hooks/useRealtimeMenu.js
import { useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Hook para escuchar cambios en la tabla menu_items
 * y disparar una función (por ejemplo, loadMenu) cada vez
 * que haya INSERT / UPDATE / DELETE.
 *
 * onChange: función sin parámetros (ej: loadMenu)
 */
export function useRealtimeMenu(onChange) {
  useEffect(() => {
    if (typeof onChange !== "function") return;

    // Creamos el canal realtime
    const channel = supabase
      .channel("realtime_menu_items")
      .on(
        "postgres_changes",
        {
          event: "*",          // INSERT, UPDATE, DELETE
          schema: "public",
          table: "menu_items",
        },
        (_payload) => {
          // Podés loguear si querés ver los eventos:
          // console.log("Cambio en menu_items:", _payload);
          onChange(); // volvemos a cargar el menú
        }
      )
      .subscribe((status) => {
        // Opcional para debug:
        // console.log("Estado canal menu_items:", status);
      });

    // Cleanup al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);
}
