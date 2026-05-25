"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function EmpleadoLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/");
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.rol !== "empleado") {
          router.push("/");
          return;
        }
        setUser(data.user);
        setLoading(false);
      } catch (err) {
        console.error("Auth check error:", err);
        router.push("/");
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  // Get initials for avatar
  const initials = user?.nombre
    ? user.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "EM";

  return (
    <div className="app-layout">
      {/* Sidebar for Desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ overflow: "hidden", padding: 0 }}>
            <img src="/logo.png" alt="AMARA Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div className="sidebar-logo-text">AMARA</div>
            <div className="sidebar-logo-sub">Panel de Empleado</div>
          </div>
        </div>

        <div className="sidebar-section-label">Menú</div>

        <Link
          href="/empleado"
          className={`sidebar-nav-item ${pathname === "/empleado" ? "active" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Registrar Asistencia
        </Link>

        <Link
          href="/empleado/historial"
          className={`sidebar-nav-item ${pathname === "/empleado/historial" ? "active" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Mi Historial
        </Link>

        <Link
          href="/empleado/solicitudes"
          className={`sidebar-nav-item ${pathname === "/empleado/solicitudes" ? "active" : ""}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Solicitudes
        </Link>

        <div style={{ marginTop: "auto" }}>
          <button onClick={handleLogout} className="sidebar-nav-item text-danger" style={{ width: "100%" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Hola, {user?.nombre?.split(" ")[0]}</h1>
            <p>Empleado | {user?.email}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm hidden-mobile"
              style={{ display: "inline-flex", gap: "6px" }}
              title="Cerrar Sesión"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Salir</span>
            </button>
            <div className="avatar" title={user?.nombre}>
              {initials}
            </div>
          </div>
        </header>

        {children}
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="mobile-nav">
        <Link
          href="/empleado"
          className={`nav-item ${pathname === "/empleado" ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Asistencia
        </Link>

        <Link
          href="/empleado/historial"
          className={`nav-item ${pathname === "/empleado/historial" ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Historial
        </Link>

        <Link
          href="/empleado/solicitudes"
          className={`nav-item ${pathname === "/empleado/solicitudes" ? "active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Solicitudes
        </Link>
      </nav>

      <style jsx global>{`
        @media (max-width: 767px) {
          .hidden-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
