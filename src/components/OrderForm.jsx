import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function isValidArgPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export default function OrderForm({ menuItems, onOrderSaved }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    menuItemId: "",
    quantity: 1,
    paymentMethod: "cash",
  });

  const [alert, setAlert] = useState(null); // {type, text}
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = useMemo(
    () => menuItems.find((m) => m.id === form.menuItemId),
    [menuItems, form.menuItemId]
  );

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "quantity") {
      let qty = Number(value) || 1;
      if (qty < 1) qty = 1;

      const maxStock = selectedItem?.stock;
      if (typeof maxStock === "number" && maxStock > 0 && qty > maxStock) {
        qty = maxStock;
      }

      setForm((prev) => ({ ...prev, quantity: qty }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);

    if (!form.menuItemId) {
      setAlert({ type: "danger", text: "Selecciona un plato." });
      return;
    }

    if (!form.firstName || !form.lastName || !form.phone) {
      setAlert({
        type: "danger",
        text: "Completa nombre, apellido y telefono.",
      });
      return;
    }

    if (!isValidArgPhone(form.phone)) {
      setAlert({
        type: "danger",
        text: "Ingresa un telefono valido de Argentina (solo numeros, con o sin codigo de area).",
      });
      return;
    }

    if (!selectedItem) {
      setAlert({
        type: "danger",
        text: "El plato seleccionado ya no esta disponible.",
      });
      return;
    }

    if (
      typeof selectedItem.stock === "number" &&
      selectedItem.stock > 0 &&
      form.quantity > selectedItem.stock
    ) {
      setAlert({
        type: "danger",
        text: `Solo quedan ${selectedItem.stock} unidades de "${selectedItem.name}".`,
      });
      return;
    }

    setShowModal(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setAlert(null);

    try {
      const { data: latestItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("id, name, price, stock")
        .eq("id", form.menuItemId)
        .single();

      if (fetchError) {
        console.error(fetchError);
        setAlert({
          type: "danger",
          text: "No se pudo verificar el stock. Intenta de nuevo.",
        });
        setSubmitting(false);
        setShowModal(false);
        return;
      }

      const qty = Number(form.quantity) || 1;

      if (!latestItem || latestItem.stock <= 0) {
        setAlert({
          type: "danger",
          text: `El plato "${latestItem?.name || "seleccionado"}" ya no tiene stock disponible.`,
        });
        setSubmitting(false);
        setShowModal(false);
        window.location.reload();
        return;
      }

      if (latestItem.stock < qty) {
        setAlert({
          type: "danger",
          text: `Solo quedan ${latestItem.stock} unidades de "${latestItem.name}". Ajusta la cantidad e intenta nuevamente.`,
        });
        setSubmitting(false);
        setShowModal(false);
        window.location.reload();
        return;
      }

      const { error: orderError } = await supabase.from("orders").insert({
        customer_first_name: form.firstName,
        customer_last_name: form.lastName,
        phone: form.phone,
        menu_item_id: latestItem.id,
        quantity: qty,
        payment_method: form.paymentMethod,
      });

      if (orderError) {
        console.error(orderError);
        setAlert({
          type: "danger",
          text: "Ocurrio un error al enviar el pedido.",
        });
        setSubmitting(false);
        setShowModal(false);
        return;
      }

      const newStock = latestItem.stock - qty;

      const { error: stockError } = await supabase
        .from("menu_items")
        .update({ stock: newStock })
        .eq("id", latestItem.id);

      if (stockError) {
        console.error(stockError);
      }

      const total = Number(latestItem.price || 0) * qty;

      setAlert({
        type: "success",
        text: "Pedido enviado correctamente!",
      });

      if (typeof onOrderSaved === "function") {
        onOrderSaved({
          id: Date.now(),
          itemName: latestItem.name,
          quantity: qty,
          paymentMethod: form.paymentMethod,
          total,
          at: new Date().toISOString(),
        });
      }

      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        menuItemId: "",
        quantity: 1,
        paymentMethod: "cash",
      });
    } finally {
      setSubmitting(false);
      setShowModal(false);
    }
  }

  function handleCancelModal() {
    setShowModal(false);
  }

  return (
    <>
      {alert && (
        <div
          className={`alert alert-${alert.type} d-flex justify-content-between align-items-center`}
        >
          <span>{alert.text}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setAlert(null)}
          ></button>
        </div>
      )}

      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-12 col-md-6">
          <label className="form-label">Nombre</label>
          <input
            type="text"
            name="firstName"
            className="form-control"
            value={form.firstName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Apellido</label>
          <input
            type="text"
            name="lastName"
            className="form-control"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Telefono</label>
          <input
            type="tel"
            name="phone"
            className="form-control"
            placeholder="Ej: 3816xxxxxx o +54 3816xxxxxx"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">Plato</label>
          <select
            name="menuItemId"
            className="form-select"
            value={form.menuItemId}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona un plato</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} (${Number(item.price).toFixed(2)}) · Stock: {item.stock}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label">Cantidad</label>
          <input
            type="number"
            min="1"
            max={
              selectedItem && typeof selectedItem.stock === "number"
                ? selectedItem.stock
                : undefined
            }
            name="quantity"
            className="form-control"
            value={form.quantity}
            onChange={handleChange}
            required
          />
          {selectedItem && (
            <div className="form-text">Stock disponible: {selectedItem.stock}</div>
          )}
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label">Metodo de pago</label>
          <select
            name="paymentMethod"
            className="form-select"
            value={form.paymentMethod}
            onChange={handleChange}
          >
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
          </select>
        </div>

        <div className="col-12">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Enviar pedido"}
          </button>
        </div>
      </form>

      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-dialog modal-dialog-centered animate-slide-up" role="document">
              <div className="modal-content border-0 shadow-colored" style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Confirmar pedido</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleCancelModal}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Plato:</span>
                      <span className="fw-semibold text-end">{selectedItem ? selectedItem.name : ""}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Cantidad:</span>
                      <span className="fw-semibold">{form.quantity}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Total estimado:</span>
                      <span className="fw-bold text-primary">
                        ${(Number(selectedItem?.price || 0) * Number(form.quantity || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="mb-1 text-muted small">Datos de contacto:</p>
                  <div className="fw-semibold">
                    {form.firstName} {form.lastName}
                  </div>
                  <div>{form.phone}</div>
                  <div className="mt-2 text-muted small">
                    Pago: {form.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleCancelModal}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4"
                    onClick={handleConfirm}
                    disabled={submitting}
                  >
                    {submitting ? "Guardando..." : "Confirmar pedido"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

