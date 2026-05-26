"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.rol === "admin") {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }
        router.push("/");
      } catch (err) {
        console.error(err);
        router.push("/");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    async function fetchCounts() {
      try {
        const [resEmp, resSol] = await Promise.all([
          fetch("/api/admin/empleados"),
          fetch("/api/solicitudes")
        ]);
        if (resEmp.ok && resSol.ok) {
          const dataEmp = await resEmp.json();
          const dataSol = await resSol.json();
          
          const accessCount = dataEmp.pendientes?.length || 0;
          const leaveCount = dataSol.solicitudes?.filter(s => s.estado === "pendiente").length || 0;
          setPendingCount(accessCount + leaveCount);
        }
      } catch (err) {
        console.error("Error fetching counts for badge:", err);
      }
    }
    fetchCounts();
    
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Error logging out", err);
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: "100vh" }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  // Determine topbar titles
  let title = "Panel de Control";
  let subtitle = "Gestión de asistencia y personal";
  if (pathname === "/admin") {
    title = "Panel de Control";
    subtitle = "Resumen diario de asistencia y empleados";
  } else if (pathname === "/admin/nomina") {
    title = "Nómina Semanal";
    subtitle = "Cálculo y recibos de pago";
  } else if (pathname === "/admin/solicitudes") {
    title = "Solicitudes";
    subtitle = "Accesos de nuevos usuarios, permisos y vacaciones";
  } else if (pathname === "/admin/configuracion") {
    title = "Configuración";
    subtitle = "Ajustes de geolocalización y horarios";
  } else if (pathname === "/admin/auditoria") {
    title = "Auditoría de Acciones";
    subtitle = "Log histórico de cambios y operaciones administrativas";
  }

  const userInitials = user
    ? user.nombre
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      label: "Nómina",
      path: "/admin/nomina",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: "Solicitudes",
      path: "/admin/solicitudes",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      label: "Auditoría",
      path: "/admin/auditoria",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      ),
    },
    {
      label: "Configuración",
      path: "/admin/configuracion",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

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
            <div className="sidebar-logo-sub">Panel de Admin</div>
          </div>
        </div>

        <div className="sidebar-section-label">Menú</div>

        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const showBadge = item.path === "/admin/solicitudes" && pendingCount > 0;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {showBadge && (
                <span className="badge badge-red" style={{ fontSize: 10, padding: "2px 6px", boxShadow: "1px 1px 0px #000000", border: "2px solid #000000", marginLeft: "auto" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", padding: "16px 12px 0" }}>
          <button
            onClick={handleLogout}
            className="sidebar-nav-item"
            style={{
              color: "var(--red-400)",
              border: "1px solid rgba(239,68,68,0.1)",
              background: "rgba(239,68,68,0.02)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="avatar" title={user?.nombre}>
              {userInitials}
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const showBadge = item.path === "/admin/solicitudes" && pendingCount > 0;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`nav-item ${isActive ? "active" : ""}`}
              style={{ position: "relative" }}
            >
              {item.icon}
              <span>{item.label}</span>
              {showBadge && (
                <span className="badge badge-red" style={{ position: "absolute", top: 2, right: 10, fontSize: 9, padding: "1px 4px", minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "1px 1px 0px #000000", border: "1.5px solid #000000" }}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        <button onClick={handleLogout} className="nav-item" style={{ color: "var(--red-400)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Salir</span>
        </button>
      </nav>
    </div>
  );
}
