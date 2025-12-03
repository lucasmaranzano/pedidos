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
    <form onSubmit={submit} className="login-form d-grid gap-3 mt-4">
      <div className="d-grid gap-1">
        <label className="form-label mb-0" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="form-control"
          type="email"
          name="email"
          value={form.email}
          onChange={change}
          required
        />
      </div>
      <div className="d-grid gap-1">
        <label className="form-label mb-0" htmlFor="login-password">
          Contraseña
        </label>
        <input
          id="login-password"
          className="form-control"
          type="password"
          name="password"
          value={form.password}
          onChange={change}
          required
        />
      </div>

      {msg && (
        <div
          className={`alert alert-${msg.type} alert-dismissible fade show mb-0`}
        >
          {msg.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMsg(null)}
          ></button>
        </div>
      )}

      <button className="btn btn-primary w-100" type="submit" disabled={loading}>
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
