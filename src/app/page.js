"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Estados para modo de registro
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [nombre, setNombre] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        setLoading(false);
        return;
      }
      if (data.usuario.rol === "admin") {
        router.push("/admin");
      } else {
        router.push("/empleado");
      }
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al registrar la cuenta");
        setLoading(false);
        return;
      }
      setSuccessMsg(data.mensaje || "Cuenta creada con éxito. Pendiente de aprobación.");
      // Limpiar formulario
      setNombre("");
      setEmail("");
      setPassword("");
      // Regresar a Login después de unos segundos
      setTimeout(() => {
        setIsRegisterMode(false);
        setSuccessMsg("");
      }, 4000);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div className="login-logo-icon" style={{ overflow: "hidden", padding: 0 }}>
            <img src="/logo.png" alt="AMARA Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 className="login-title" style={{ marginTop: 16 }}>AMARA</h1>
          <p className="login-subtitle">
            {isRegisterMode ? "Registro de Empleado" : "Sistema de Control y Asistencia"}
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {!isRegisterMode ? (
          /* FORMULARIO DE INICIO DE SESIÓN */
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg mt-4"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : null}
                {loading ? "Ingresando..." : "Iniciar Sesión"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-full"
                onClick={() => {
                  setIsRegisterMode(true);
                  setError("");
                  setSuccessMsg("");
                }}
              >
                ¿No tienes cuenta? Regístrate aquí
              </button>
            </div>
          </>
        ) : (
          /* FORMULARIO DE REGISTRO */
          <>
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-nombre">Nombre Completo</label>
                <input
                  id="register-nombre"
                  type="text"
                  className="form-input"
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Correo electrónico</label>
                <input
                  id="register-email"
                  type="email"
                  className="form-input"
                  placeholder="juan.perez@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Contraseña</label>
                <input
                  id="register-password"
                  type="password"
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-success btn-full btn-lg mt-4"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : null}
                {loading ? "Registrando..." : "Crear Cuenta"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-full"
                onClick={() => {
                  setIsRegisterMode(false);
                  setError("");
                  setSuccessMsg("");
                }}
                disabled={loading}
              >
                ¿Ya tienes cuenta? Inicia Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
