import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useOrderCutoff } from "../hooks/useOrderCutoff";
import { useRealtimeMenu } from "../hooks/useRealtimeMenu";
import { useRealtimeSettings } from "../hooks/useRealtimeSettings";
import OrderForm from "./OrderForm";

const STORAGE_KEY = "lita-orders-history";

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function readOrdersToday() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const today = getTodayKey();
    return Array.isArray(parsed)
      ? parsed.filter((o) => o.date === today)
      : [];
  } catch (e) {
    console.error("No se pudo leer pedidos locales", e);
    return [];
  }
}

function writeOrdersToday(orders) {
  if (typeof window === "undefined") return;
  const today = getTodayKey();
  const payload = orders.map((o) => ({ ...o, date: today }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export default function PublicMenu() {
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [menuOpen, setMenuOpen] = useState(true);
  const [orderWindow, setOrderWindow] = useState({
    start: { hour: 9, minute: 0 },
    cutoff: { hour: 11, minute: 30 },
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [ordersToday, setOrdersToday] = useState([]);

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

  const refreshLocalOrders = useCallback(() => {
    setOrdersToday(readOrdersToday());
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    refreshLocalOrders();
  }, [refreshLocalOrders]);

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

  function handleOrderSaved(order) {
    const today = getTodayKey();
    const next = [...readOrdersToday(), { ...order, date: today }];
    writeOrdersToday(next);
    setOrdersToday(next);
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 animate-fade-in">
        <div className="section-title mb-0">Menú del día</div>
        <span className="tag">
          {visibleMenu.length} opciones &bull; {canOrder ? "Abierto" : "Cerrado"}
        </span>
      </div>

      {globalLoading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {!globalLoading && !showMenuToClient && (
        <div className="card glass-card text-center py-5 px-3 animate-slide-up">
          <h2 className="h5 mb-2 fw-bold">Menú en preparación</h2>
          <p className="text-muted mb-0">
            Estamos organizando los platos del día. Volvé a intentar en unos minutos.
          </p>
        </div>
      )}

      {!globalLoading && showMenuToClient && (
        <div className="d-flex flex-column gap-4">
          <section>
            {loadingMenu && <p className="text-muted">Cargando menú...</p>}

            {!loadingMenu && visibleMenu.length === 0 && (
              <div className="alert alert-light border-0 shadow-sm">
                Por el momento no hay platos disponibles.
              </div>
            )}

            {!loadingMenu && visibleMenu.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {visibleMenu.map((item, index) => (
                  <div
                    key={item.id}
                    className="menu-card animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="menu-card-content">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold text-main">{item.name}</div>
                      </div>
                      <div className="text-muted small line-clamp-2">
                        {item.description || "Sin descripción"}
                      </div>
                    </div>

                    <div className="menu-card-footer">
                      <div className="d-flex flex-column align-items-end align-items-md-center">
                        <span className="fw-bold text-primary fs-5">
                          ${Number(item.price).toFixed(0)}
                        </span>
                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                          {item.stock} unid.
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="section-title h5 mb-4">Hacer un pedido</div>

                {windowState === "before" && (
                  <div className="alert alert-info border-0 bg-primary-soft text-primary mb-3">
                    Los pedidos abren a las <strong>{startLabel}</strong>.
                  </div>
                )}

                {windowState === "after" && (
                  <div className="alert alert-warning border-0 mb-3">
                    El horario de pedido finalizó a las <strong>{cutoffLabel}</strong>.
                  </div>
                )}

                {windowState === "open" && !showMenuToClient && (
                  <div className="alert alert-info border-0 mb-3">
                    El menú está oculto por el momento.
                  </div>
                )}

                {canOrder && (
                  <OrderForm
                    menuItems={visibleMenu}
                    onOrderSaved={handleOrderSaved}
                  />
                )}
              </div>
            </div>
          </section>

          <section className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h2 className="h6 mb-3 fw-bold ps-2 border-start border-4 border-primary">Tus pedidos de hoy</h2>

                {ordersToday.length === 0 && (
                  <div className="text-center py-4 text-muted bg-light rounded-3">
                    No tenés pedidos hoy.
                  </div>
                )}

                {ordersToday.length > 0 && (
                  <div className="d-flex flex-column gap-2">
                    {ordersToday.map((o) => (
                      <div key={o.id} className="d-flex justify-content-between align-items-center bg-white border p-3 rounded-3 shadow-sm">
                        <div>
                          <div className="fw-semibold text-main">{o.itemName}</div>
                          <div className="small text-muted">
                            x{o.quantity} · {o.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold text-primary">${Number(o.total || 0).toFixed(0)}</div>
                          <div className="small text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(o.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

