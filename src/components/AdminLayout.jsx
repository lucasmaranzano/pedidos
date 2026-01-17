import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import MenuManager from "./MenuManager";
import OrdersAdmin from "./OrdersAdmin";

export default function AdminLayout() {
  const { signOut, user } = useAuthStore();
  const [tab, setTab] = useState("menu");

  return (
    <div className="container py-3 py-md-4 animate-fade-in">
      <div className="d-flex flex-column gap-3">
        <div className="card shadow-sm border-0">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span className="fw-semibold text-muted">Admin:</span>{" "}
              <span className="fw-bold">{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={signOut}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body">
            <ul className="nav nav-pills flex-column flex-sm-row gap-2 gap-sm-0">
              <li className="nav-item flex-fill">
                <button
                  type="button"
                  className={`nav-link w-100 fw-semibold ${tab === "menu" ? "active" : "text-muted"}`}
                  onClick={() => setTab("menu")}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Menú
                </button>
              </li>
              <li className="nav-item flex-fill">
                <button
                  type="button"
                  className={`nav-link w-100 fw-semibold ${tab === "orders" ? "active" : "text-muted"
                    }`}
                  onClick={() => setTab("orders")}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Pedidos
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="animate-slide-up">
          {tab === "menu" && <MenuManager />}
          {tab === "orders" && <OrdersAdmin />}
        </div>
      </div>
    </div>
  );
}
