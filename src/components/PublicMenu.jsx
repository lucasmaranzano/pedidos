import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useOrderCutoff } from "../hooks/useOrderCutoff";
import { useRealtimeMenu } from "../hooks/useRealtimeMenu";
import { useRealtimeSettings } from "../hooks/useRealtimeSettings";
import OrderForm from "./OrderForm";

export default function PublicMenu() {
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [menuOpen, setMenuOpen] = useState(true);
  const [orderWindow, setOrderWindow] = useState({
    start: { hour: 9, minute: 0 },
    cutoff: { hour: 11, minute: 30 },
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  const {
    isOpen: isWithinWindow,
    state: windowState,
    start: startValue,
    cutoff: cutoffValue,
  } = useOrderCutoff(orderWindow);

  const loadMenu = useCallback(async () => {
    setLoadingMenu(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando menu:", error.message);
      setMenu([]);
    } else {
      setMenu(data || []);
    }
    setLoadingMenu(false);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const { data, error } = await supabase
      .from("app_settings")
      .select(
        "id, menu_open, order_cutoff_hour, order_cutoff_minute, order_start_hour, order_start_minute"
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error cargando app_settings:", error.message);
      setMenuOpen(true);
      setOrderWindow({
        start: { hour: 9, minute: 0 },
        cutoff: { hour: 11, minute: 30 },
      });
    } else if (data) {
      setMenuOpen(data.menu_open);
      setOrderWindow({
        start: {
          hour: data.order_start_hour ?? 9,
          minute: data.order_start_minute ?? 0,
        },
        cutoff: {
          hour: data.order_cutoff_hour ?? 11,
          minute: data.order_cutoff_minute ?? 30,
        },
      });
    }
    setLoadingSettings(false);
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useRealtimeMenu(loadMenu);
  useRealtimeSettings(loadSettings);

  const visibleMenu = menu.filter((item) => item.stock > 0);

  const globalLoading = loadingMenu || loadingSettings;
  const showMenuToClient = menuOpen;
  const canOrder = showMenuToClient && isWithinWindow;
  const cutoffLabel = `${String(cutoffValue.hour).padStart(2, "0")}:${String(
    cutoffValue.minute
  ).padStart(2, "0")}`;
  const startLabel = `${String(startValue.hour).padStart(2, "0")}:${String(
    startValue.minute
  ).padStart(2, "0")}`;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="section-title mb-0">Menu del dia</div>
        <span className="tag">
          {visibleMenu.length} opciones · {canOrder ? "Abierto" : "Cerrado"}
        </span>
      </div>

      {globalLoading && (
        <div className="alert alert-secondary mb-0">
          Cargando informacion del menu...
        </div>
      )}

      {!globalLoading && !showMenuToClient && (
        <div className="alert alert-info text-center py-4 mb-0">
          <h2 className="h5 mb-2">Menu en preparacion</h2>
          <p className="mb-0">
            Estamos organizando los platos del dia. Volve a intentar en unos
            minutos.
          </p>
        </div>
      )}

      {!globalLoading && showMenuToClient && (
        <div className="d-flex flex-column gap-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Menu del dia</h2>

              {loadingMenu && (
                <p className="text-muted mb-0">Cargando menu...</p>
              )}

              {!loadingMenu && visibleMenu.length === 0 && (
                <p className="text-muted mb-0">
                  Por el momento no hay platos disponibles.
                </p>
              )}

              {!loadingMenu && visibleMenu.length > 0 && (
                <div className="d-flex flex-column gap-2">
                  {visibleMenu.map((item) => (
                    <div key={item.id} className="menu-card">
                      <div>
                        <div className="fw-semibold">{item.name}</div>
                        {item.description && (
                          <div className="muted">{item.description}</div>
                        )}
                        <div className="small text-muted">
                          Stock disponible: {item.stock}
                        </div>
                      </div>
                      <div className="fw-bold">
                        ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Hacer un pedido</h2>

              {windowState === "before" && (
                <div className="alert alert-info mb-3">
                  Los pedidos abren a las <strong>{startLabel}</strong>.
                </div>
              )}

              {windowState === "after" && (
                <div className="alert alert-warning mb-3">
                  El horario de toma de pedidos es de {startLabel} a
                  {" "}
                  <strong>{cutoffLabel}</strong>. El formulario esta cerrado.
                </div>
              )}

              {windowState === "open" && !showMenuToClient && (
                <div className="alert alert-info mb-3">
                  El menu esta oculto por el admin. Intenta mas tarde.
                </div>
              )}

              {canOrder && <OrderForm menuItems={visibleMenu} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
