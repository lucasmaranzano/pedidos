import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import PublicMenu from "./components/PublicMenu";
import AdminLayout from "./components/AdminLayout";
import LoginForm from "./components/LoginForm";
import logo from "./logo.jpg";

function ClientPage() {
  return (
    <div className="app-shell animate-fade-in">
      {/* Header publico */}
      <header className="py-4">
        <div className="container layout-narrow">
          <div className="hero">
            <img
              src={logo}
              alt="Lo de Lita"
              style={{ height: 64, width: "auto" }}
              className="img-fluid"
            />
            <div>
              <div className="hero-title">Lo de Lita</div>
              <div className="text-muted fw-normal">Hacé tu pedido del día. Rápido y simple.</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow-1">
        <div className="container layout-narrow pb-5">
          <PublicMenu />
        </div>
      </main>
    </div>
  );
}

function AdminGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="app-shell d-flex justify-content-center align-items-center">
        <span className="text-muted">Cargando...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell bg-light d-flex justify-content-center align-items-center px-3">
        <div className="container" style={{ maxWidth: 520 }}>
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Acceso administrador</h2>
              <p className="small text-muted">
                Inicia sesion para gestionar el menu y los pedidos.
              </p>
              <LoginForm />
              <div className="mt-3 text-center">
                <Link to="/" className="small">
                  Volver al menu del cliente
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-light">
      <AdminLayout session={session} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ClientPage />} />
      <Route path="/admin" element={<AdminGate />} />
    </Routes>
  );
}
