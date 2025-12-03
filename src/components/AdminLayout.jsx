import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import MenuManager from "./MenuManager";
import OrdersAdmin from "./OrdersAdmin";

export default function AdminLayout() {
  const { signOut, user } = useAuthStore();
  const [tab, setTab] = useState("menu");

  return (
    <div className="container py-3 py-md-4">
      <div className="d-flex flex-column gap-3">
        <div className="card shadow-sm">
          <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span className="fw-semibold">Admin:</span>{" "}
              <span>{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline-light btn-sm bg-secondary text-white"
              onClick={signOut}
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <ul className="nav nav-pills flex-column flex-sm-row gap-2 gap-sm-0">
              <li className="nav-item flex-fill">
                <button
                  type="button"
                  className={`nav-link w-100 ${tab === "menu" ? "active" : ""}`}
                  onClick={() => setTab("menu")}
                >
                  Menu
                </button>
              </li>
              <li className="nav-item flex-fill">
                <button
                  type="button"
                  className={`nav-link w-100 ${
                    tab === "orders" ? "active" : ""
                  }`}
                  onClick={() => setTab("orders")}
                >
                  Pedidos
                </button>
              </li>
            </ul>
          </div>
        </div>

        {tab === "menu" && <MenuManager />}
        {tab === "orders" && <OrdersAdmin />}
      </div>
    </div>
  );
}
