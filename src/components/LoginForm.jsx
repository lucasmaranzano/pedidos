import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";

export default function LoginForm() {
  const { signIn } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  function change(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await signIn(form.email, form.password);
    } catch (error) {
      console.error(error);
      setMsg({
        type: "danger",
        text: error.message || "Credenciales incorrectas",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-6 col-lg-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="h5 mb-3">Login administrador</h2>

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

            <form onSubmit={submit} className="d-grid gap-3">
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  required
                />
              </div>
              <div>
                <label className="form-label">Contraseña</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  required
                />
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
