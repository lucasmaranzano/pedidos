import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useRealtimeMenu } from "../hooks/useRealtimeMenu";

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    price: "",
    is_active: true,
    stock: 0,
  });

  const [settings, setSettings] = useState({
    id: 1,
    menuOpen: true,
    loading: true,
    saving: false,
  });

  const loadMenu = useCallback(async () => {
    setLoadingMenu(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setMsg({ type: "danger", text: "Error cargando menú" });
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoadingMenu(false);
  }, []);

  const loadSettings = useCallback(async () => {
    setSettings((prev) => ({ ...prev, loading: true }));
    const { data, error } = await supabase
      .from("app_settings")
      .select("id, menu_open")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error cargando app_settings:", error);
      setSettings((prev) => ({
        ...prev,
        loading: false,
      }));
    } else if (data) {
      setSettings({
        id: data.id,
        menuOpen: data.menu_open,
        loading: false,
        saving: false,
      });
    }
  }, []);

  useEffect(() => {
    loadMenu();
    loadSettings();
  }, [loadMenu, loadSettings]);

  useRealtimeMenu(loadMenu);

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        type === "checkbox"
          ? checked
          : name === "stock" || name === "price"
          ? value
          : value,
    }));
  }

  function editItem(item) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: item.price,
      is_active: item.is_active,
      stock: item.stock ?? 0,
    });
  }

  function resetForm() {
    setForm({
      id: null,
      name: "",
      description: "",
      price: "",
      is_active: true,
      stock: 0,
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      is_active: form.is_active,
      stock: Number(form.stock) || 0,
    };

    let error;
    if (form.id) {
      const res = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", form.id);
      error = res.error;
    } else {
      const res = await supabase.from("menu_items").insert(payload);
      error = res.error;
    }

    if (error) {
      console.error(error);
      setMsg({ type: "danger", text: "Error guardando plato" });
    } else {
      setMsg({ type: "success", text: "Plato guardado" });
      resetForm();
      loadMenu();
    }
  }

  async function remove(id) {
    // Verificamos si tiene pedidos asociados
    const { data: relatedOrders, error: relError } = await supabase
      .from("orders")
      .select("id")
      .eq("menu_item_id", id)
      .limit(1);

    if (relError) {
      console.error(relError);
      setMsg({
        type: "danger",
        text: "No se pudo verificar si el plato tiene pedidos asociados.",
      });
      return;
    }

    if (relatedOrders && relatedOrders.length > 0) {
      setMsg({
        type: "warning",
        text: "No podés eliminar este plato porque tiene pedidos asociados. Podés desactivarlo desmarcando la opción 'Activo'.",
      });
      return;
    }

    if (!window.confirm("¿Eliminar este plato?")) return;

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      console.error(error);
      setMsg({ type: "danger", text: "Error eliminando plato" });
    } else {
      loadMenu();
    }
  }

  async function updateStock(id, newStock) {
    const safeStock = newStock < 0 ? 0 : newStock;
    const { error } = await supabase
      .from("menu_items")
      .update({ stock: safeStock })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMsg({ type: "danger", text: "Error actualizando stock" });
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stock: safeStock } : item
      )
    );
  }

  async function toggleMenuVisibility() {
    if (!settings.id) return;

    const newValue = !settings.menuOpen;
    setSettings((prev) => ({ ...prev, menuOpen: newValue, saving: true }));

    const { error } = await supabase
      .from("app_settings")
      .update({ menu_open: newValue })
      .eq("id", settings.id);

    if (error) {
      console.error(error);
      setMsg({
        type: "danger",
        text: "No se pudo actualizar el estado del menú.",
      });
      setSettings((prev) => ({ ...prev, menuOpen: !newValue, saving: false }));
    } else {
      setSettings((prev) => ({ ...prev, saving: false }));
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Gestión de menú</h2>

          {msg && (
            <div
              className={`alert alert-${msg.type} alert-dismissible fade show`}
            >
              {msg.text}
              <button
                type="button"
                className="btn-close"
                onClick={() => setMsg(null)}
              ></button>
            </div>
          )}

          {/* Switch global menú visible / preparación */}
          <div className="mb-3">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="menuPreparation"
                checked={!settings.menuOpen}
                disabled={settings.loading || settings.saving}
                onChange={toggleMenuVisibility}
              />
              <label
                className="form-check-label"
                htmlFor="menuPreparation"
              >
                Ocultar menú al público (modo preparación)
              </label>
            </div>
            <div className="form-text">
              Cuando esté activado, los clientes verán el mensaje{" "}
              <strong>"Menú en preparación"</strong> y no podrán hacer pedidos.
            </div>
          </div>

          {/* FORMULARIO PLATOS */}
          <form className="row g-3 align-items-end" onSubmit={submit}>
            <div className="col-12 col-md-3">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={change}
                required
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Descripción</label>
              <input
                className="form-control"
                name="description"
                value={form.description}
                onChange={change}
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Precio</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="0.01"
                name="price"
                value={form.price}
                onChange={change}
                required
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label">Stock</label>
              <input
                className="form-control"
                type="number"
                min="0"
                step="1"
                name="stock"
                value={form.stock}
                onChange={change}
              />
            </div>

            <div className="col-6 col-md-2 d-flex align-items-center">
              <div className="form-check mt-3 mt-md-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={form.is_active}
                  onChange={change}
                />
                <label className="form-check-label" htmlFor="is_active">
                  Activo
                </label>
              </div>
            </div>

            <div className="col-12 text-md-end">
              <button className="btn btn-primary me-2" type="submit">
                {form.id ? "Actualizar plato" : "Crear plato"}
              </button>
              {form.id && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* TABLA DE PLATOS */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h3 className="h6 mb-3">Platos existentes</h3>

          {loadingMenu && <p className="text-muted mb-0">Cargando...</p>}

          {!loadingMenu && items.length === 0 && (
            <p className="text-muted mb-0">No hay platos.</p>
          )}

          {!loadingMenu && items.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.name}</div>
                        {item.description && (
                          <div className="small text-muted">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td>${Number(item.price).toFixed(2)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary">
                            {item.stock ?? 0}
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() =>
                              updateStock(item.id, (item.stock || 0) + 1)
                            }
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              updateStock(item.id, (item.stock || 0) - 1)
                            }
                          >
                            -1
                          </button>
                        </div>
                      </td>
                      <td>
                        {item.is_active ? (
                          <span className="badge bg-success">Activo</span>
                        ) : (
                          <span className="badge bg-secondary">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => editItem(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => remove(item.id)}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
