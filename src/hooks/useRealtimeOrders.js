import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useRealtimeOrders(onInsert) {
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          if (onInsert) onInsert(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onInsert]);
}
