import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRealtimeOrders } from "../hooks/useRealtimeOrders";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  return Number(n || 0).toFixed(2);
}

function normalizePhoneForWa(phone) {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("54")) digits = "54" + digits;
  return digits;
}

export default function OrdersAdmin() {
  const [date, setDate] = useState(todayISO());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pendingOrder, setPendingOrder] = useState(null); // para "Preparado + WhatsApp"
  const [orderToDelete, setOrderToDelete] = useState(null); // para modal de eliminar

  const [filter, setFilter] = useState("all"); // all | unpaid | unprepared
  const [kitchenMode, setKitchenMode] = useState(false);

  const loadOrders = useCallback(async (targetDate) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, menu_items(name, price, stock)")
      .eq("order_date", targetDate)
      .order("created_at", { ascending: true });

    if (!error) setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders(date);
  }, [date, loadOrders]);

  useRealtimeOrders(
    useCallback(
      (newOrder) => {
        if (newOrder.order_date === date) {
          loadOrders(date);
        }
      },
      [date, loadOrders]
    )
  );

  async function togglePaid(order) {
    const { error } = await supabase
      .from("orders")
      .update({ is_paid: !order.is_paid })
      .eq("id", order.id);

    if (error) {
      console.error(error);
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, is_paid: !o.is_paid } : o))
    );
  }

  async function togglePrepared(order) {
    if (!order.is_prepared) {
      setPendingOrder(order);
    } else {
      const { error } = await supabase
        .from("orders")
        .update({ is_prepared: false })
        .eq("id", order.id);

      if (error) {
        console.error(error);
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, is_prepared: false } : o))
      );
    }
  }

  async function confirmPrepared(sendWhatsapp) {
    if (!pendingOrder) return;
    const order = pendingOrder;

    const { error } = await supabase
      .from("orders")
      .update({ is_prepared: true })
      .eq("id", order.id);

    if (error) {
      console.error(error);
      setPendingOrder(null);
      return;
    }

    // Actualizamos en memoria
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, is_prepared: true } : o))
    );

    if (sendWhatsapp) {
      const phone = normalizePhoneForWa(order.phone);
      const item = order.menu_items;
      const unitPrice = item?.price || 0;
      const total = order.total_amount || unitPrice * order.quantity;
      const cliente = `${order.customer_first_name} ${order.customer_last_name}`;
      const itemName = item?.name || "pedido";

      const text =
        order.payment_method === "transfer"
          ? `Hola ${cliente} 👋🙂

Tenemos excelentes noticias 🎉
Tu pedido *${itemName} x${order.quantity}* ya está listo 😄

💰 Total a abonar: *$${total}*

🏦 Datos para transferencia:
*0720069488000006878722*

Cuando hagas el pago avisanos por acá 🙏

¡Gracias por elegirnos! ❤️
Que tengas un hermoso día ⭐`
          : `Hola ${cliente} 👋🙂

Tenemos excelentes noticias 🎉
Tu pedido *${itemName} x${order.quantity}* ya está listo 😄

💰 Total a abonar: *$${total}*

Recordá tener el dinero justo al recibir tu pedido 🙏

¡Gracias por elegirnos! ❤️
Que tengas un hermoso día ⭐`;

      const encodedText = encodeURIComponent(text);
      const url = `https://wa.me/${phone}?text=${encodedText}`;
      window.open(url, "_blank");
    }

    setPendingOrder(null);
  }

  // 🧹 Eliminar pedido (lógica real, sin confirm del usuario)
  async function reallyDeleteOrder(order) {
    try {
      // 1) Obtener plato y stock actual
      const { data: item, error: itemError } = await supabase
        .from("menu_items")
        .select("id, stock")
        .eq("id", order.menu_item_id)
        .single();

      if (itemError) {
        console.error("Error obteniendo plato para stock:", itemError);
      }

      if (item) {
        const newStock = (item.stock || 0) + (order.quantity || 0);
        const { error: updError } = await supabase
          .from("menu_items")
          .update({ stock: newStock })
          .eq("id", item.id);

        if (updError) {
          console.error("Error actualizando stock:", updError);
        }
      }

      // 2) Borrar pedido
      const { error: delError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (delError) {
        console.error("Error eliminando pedido:", delError);
        return;
      }

      // 3) Actualizar estado
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (e) {
      console.error("Error general al eliminar pedido:", e);
    }
  }

  // Modal: confirmar eliminación
  async function confirmDeleteOrder() {
    if (!orderToDelete) return;
    const order = orderToDelete;
    setOrderToDelete(null);
    await reallyDeleteOrder(order);
  }

  const stats = useMemo(() => {
    let total = 0;
    let unpaid = 0;
    let cash = 0;
    let transfer = 0;
    let unprepared = 0;

    for (const o of orders) {
      const unitPrice = o.menu_items?.price || 0;
      const amount = Number(o.total_amount || unitPrice * o.quantity || 0);

      total += amount;
      if (!o.is_paid) unpaid += amount;
      if (!o.is_prepared) unprepared++;
      if (o.payment_method === "cash") cash += amount;
      if (o.payment_method === "transfer") transfer += amount;
    }

    return {
      count: orders.length,
      total,
      unpaid,
      cash,
      transfer,
      unprepared,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (filter === "unpaid") {
      list = list.filter((o) => !o.is_paid);
    } else if (filter === "unprepared") {
      list = list.filter((o) => !o.is_prepared);
    }

    if (kitchenMode) {
      list = list.filter((o) => !o.is_prepared);
    }

    return list;
  }, [orders, filter, kitchenMode]);

  return (
    <>
      {/* Modal: Pedido preparado + WhatsApp */}
      {pendingOrder && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Pedido preparado</h5>
                  <button
                    className="btn-close"
                    onClick={() => setPendingOrder(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  ¿Deseás enviar un WhatsApp al cliente avisando que su pedido
                  ya está listo?
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => confirmPrepared(false)}
                  >
                    No enviar
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => confirmPrepared(true)}
                  >
                    Enviar WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Modal: Eliminar pedido */}
      {orderToDelete && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Eliminar pedido</h5>
                  <button
                    className="btn-close"
                    onClick={() => setOrderToDelete(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  ¿Seguro que querés eliminar este pedido? Se devolverá el stock
                  del plato.
                  <div className="mt-2 small text-muted">
                    Cliente: {orderToDelete.customer_first_name}{" "}
                    {orderToDelete.customer_last_name} —{" "}
                    {orderToDelete.menu_items?.name} × {orderToDelete.quantity}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setOrderToDelete(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={confirmDeleteOrder}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Dashboard / filtros */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end mb-3">
            <div className="col-12 col-md-5 col-lg-4">
              <h2 className="h5 mb-2">Pedidos</h2>
              <label className="small text-muted w-100">
                Fecha seleccionada:
                <input
                  type="date"
                  className="form-control form-control-sm mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="col-12 col-md-5 col-lg-5">
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm btn-outline-secondary flex-fill ${
                    filter === "all" ? "active" : ""
                  }`}
                  onClick={() => setFilter("all")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm btn-outline-secondary flex-fill ${
                    filter === "unpaid" ? "active" : ""
                  }`}
                  onClick={() => setFilter("unpaid")}
                >
                  No pagados
                </button>
                <button
                  type="button"
                  className={`btn btn-sm btn-outline-secondary flex-fill ${
                    filter === "unprepared" ? "active" : ""
                  }`}
                  onClick={() => setFilter("unprepared")}
                >
                  Sin preparar
                </button>
              </div>
            </div>

            <div className="col-12 col-md-2 col-lg-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="kitchenMode"
                  checked={kitchenMode}
                  onChange={(e) => setKitchenMode(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="kitchenMode">
                  Modo cocina
                </label>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="row g-2">
            <div className="col-6 col-md-4 col-lg-2">
              <div className="border rounded p-2 bg-light">
                <div className="text-muted small">Total del día</div>
                <div className="fw-bold">${formatMoney(stats.total)}</div>
                <div className="small text-muted">{stats.count} pedidos</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="border rounded p-2 bg-light">
                <div className="text-muted small">Por pagar</div>
                <div className="fw-bold text-danger">
                  ${formatMoney(stats.unpaid)}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="border rounded p-2 bg-light">
                <div className="text-muted small">
                  Pendientes de preparación
                </div>
                <div className="fw-bold text-primary">{stats.unprepared}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="border rounded p-2 bg-light">
                <div className="text-muted small">Efectivo</div>
                <div className="fw-bold">${formatMoney(stats.cash)}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="border rounded p-2 bg-light">
                <div className="text-muted small">Transferencia</div>
                <div className="fw-bold">${formatMoney(stats.transfer)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="card shadow-sm">
        <div className="card-body">
          {loading && <p className="text-muted mb-0">Cargando pedidos...</p>}

          {!loading && filteredOrders.length === 0 && (
            <p className="text-muted mb-0">No hay pedidos para este filtro.</p>
          )}

          {!loading &&
            filteredOrders.map((o) => {
              const time = o.created_at
                ? new Date(o.created_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const phoneWa = normalizePhoneForWa(o.phone);
              const itemName = o.menu_items?.name || "Pedido";

              return (
                <div
                  key={o.id}
                  className={`card border-0 border-start border-4 mb-2 ${
                    kitchenMode && !o.is_prepared
                      ? "border-warning-subtle"
                      : "border-primary-subtle"
                  }`}
                >
                  <div className="card-body py-2">
                    <div className="d-flex justify-content-between flex-wrap gap-1">
                      <div>
                        <div className="fw-semibold">
                          {o.customer_first_name} {o.customer_last_name}
                        </div>
                        <div className="small">
                          <a
                            href={`https://wa.me/${phoneWa}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success text-decoration-none"
                          >
                            WhatsApp: {o.phone}
                          </a>
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="fw-bold">
                          ${formatMoney(o.total_amount)}
                        </div>
                        {time && (
                          <div className="small text-muted">Hora: {time}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 small">
                      <strong>Plato:</strong> {itemName} × {o.quantity}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                      <div className="d-flex flex-wrap gap-1 align-items-center">
                        <span
                          className={`badge ${
                            o.payment_method === "cash"
                              ? "bg-warning-subtle text-warning-emphasis"
                              : "bg-info-subtle text-info-emphasis"
                          }`}
                        >
                          {o.payment_method === "cash"
                            ? "Efectivo"
                            : "Transferencia"}
                        </span>
                        <span
                          className={`badge ${
                            o.is_paid
                              ? "bg-success-subtle text-success-emphasis"
                              : "bg-danger-subtle text-danger-emphasis"
                          }`}
                        >
                          {o.is_paid ? "Pagado" : "Pendiente"}
                        </span>
                        <span
                          className={`badge ${
                            o.is_prepared ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          {o.is_prepared ? "Preparado" : "Sin preparar"}
                        </span>
                      </div>

                      <div className="d-flex flex-wrap gap-3 align-items-center">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`paid-${o.id}`}
                            checked={o.is_paid}
                            onChange={() => togglePaid(o)}
                          />
                          <label
                            className="form-check-label small"
                            htmlFor={`paid-${o.id}`}
                          >
                            Pagado
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`prep-${o.id}`}
                            checked={o.is_prepared}
                            onChange={() => togglePrepared(o)}
                          />
                          <label
                            className="form-check-label small"
                            htmlFor={`prep-${o.id}`}
                          >
                            Preparado
                          </label>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setOrderToDelete(o)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
