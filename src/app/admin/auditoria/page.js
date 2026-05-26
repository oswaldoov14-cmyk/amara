"use client";

import { useEffect, useState } from "react";

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters
  const [accion, setAccion] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  // Pagination
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, limite: 50, paginas: 1 });

  // Users list for filtering
  const [users, setUsers] = useState([]);

  // Selected log for detailed view modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Available unique actions for filter dropdown
  const accionesPredefinidas = [
    "Actualizar configuración",
    "Crear empleado",
    "Modificar empleado",
    "Aprobar/Activar empleado",
    "Desactivar empleado",
    "Eliminar empleado",
    "Rechazar solicitud de acceso",
    "Aprobar solicitud",
    "Rechazar solicitud"
  ];

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/empleados");
      if (res.ok) {
        const data = await res.json();
        // Combine active and pending to get all users
        const allUsers = [...(data.activos || []), ...(data.pendientes || [])];
        // Add admin too if it's there, but usually we just list everyone
        setUsers(allUsers);
      }
    } catch (err) {
      console.error("Error fetching users for filter:", err);
    }
  }

  async function fetchLogs(pageToFetch = pagina) {
    setLoading(true);
    setError("");
    try {
      let query = `?pagina=${pageToFetch}&limite=20`;
      if (accion) query += `&accion=${encodeURIComponent(accion)}`;
      if (usuarioId) query += `&usuario_id=${usuarioId}`;
      if (fechaInicio) query += `&fecha_inicio=${fechaInicio}`;
      if (fechaFin) query += `&fecha_fin=${fechaFin}`;

      const res = await fetch(`/api/admin/auditoria${query}`);
      if (!res.ok) throw new Error("Error al obtener los logs de auditoría");
      const data = await res.json();
      
      setLogs(data.logs || []);
      setPaginacion(data.paginacion || { total: 0, pagina: 1, limite: 20, paginas: 1 });
      setPagina(pageToFetch);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los registros de auditoría.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchLogs(1);
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setAccion("");
    setUsuarioId("");
    setFechaInicio("");
    setFechaFin("");
    // We fetch logs with page 1 immediately
    setTimeout(() => {
      fetchLogs(1);
    }, 50);
  };

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return "";
    try {
      const date = new Date(fechaStr.replace(" ", "T"));
      return date.toLocaleString("es-MX", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return fechaStr;
    }
  };

  const formatJsonDetails = (detallesStr) => {
    if (!detallesStr) return null;
    try {
      const parsed = JSON.parse(detallesStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return detallesStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters Form Card */}
      <div className="card">
        <form onSubmit={handleFilterSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Acción</label>
              <select
                className="form-input"
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
              >
                <option value="">Todas las acciones</option>
                {accionesPredefinidas.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Administrador</label>
              <select
                className="form-input"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
              >
                <option value="">Todos los usuarios</option>
                {/* As we might have logs from admin, we add a hardcoded option for admin if not in list */}
                <option value="1">Administrador (admin@empresa.com)</option>
                {users
                  .filter((u) => u.rol === "admin" && u.id !== 1)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.email})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-input"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-input"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearFilters}
            >
              Limpiar Filtros
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              Filtrar Logs
            </button>
          </div>
        </form>
      </div>

      {/* Audit Logs Table Card */}
      <div className="card" style={{ overflowX: "auto", padding: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "3px solid #000" }}>
          <h3 className="section-title" style={{ fontSize: "1.2rem" }}>Historial de Eventos</h3>
          <p className="section-subtitle">Operaciones críticas y administrativas registradas en el sistema</p>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 12, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Cargando registros...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
            No se encontraron registros de auditoría que coincidan con los filtros.
          </div>
        ) : (
          <>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 24px" }}>Fecha / Hora</th>
                  <th style={{ textAlign: "left", padding: "12px 24px" }}>Usuario Admin</th>
                  <th style={{ textAlign: "left", padding: "12px 24px" }}>Acción realizada</th>
                  <th style={{ textAlign: "center", padding: "12px 24px" }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                      {formatFecha(log.creado_en)}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "0.9rem" }}>
                      <strong>{log.usuario_email}</strong>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        ID: {log.usuario_id}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <span className={`badge ${
                        log.accion.includes("Crear") || log.accion.includes("Aprobar")
                          ? "badge-green"
                          : log.accion.includes("Eliminar") || log.accion.includes("Rechazar") || log.accion.includes("Desactivar")
                          ? "badge-red"
                          : "badge-blue"
                      }`} style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                        {log.accion}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "center" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedLog(log)}
                        style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      >
                        Ver JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {paginacion.paginas > 1 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderTop: "3px solid #000"
              }}>
                <span className="text-xs text-secondary">
                  Mostrando página {paginacion.pagina} de {paginacion.paginas} ({paginacion.total} registros en total)
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={pagina === 1}
                    onClick={() => fetchLogs(pagina - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={pagina === paginacion.paginas}
                    onClick={() => fetchLogs(pagina + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detailed View Modal */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 className="modal-title">Detalles del Evento #{selectedLog.id}</h3>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>&times;</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p className="text-xs text-muted" style={{ marginBottom: 4 }}>Información de la Operación</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 12, backgroundColor: "var(--bg-secondary)", border: "2px solid #000", borderRadius: 4 }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>ACCIÓN</span>
                    <strong style={{ fontSize: "0.9rem" }}>{selectedLog.accion}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>FECHA Y HORA</span>
                    <strong style={{ fontSize: "0.9rem" }}>{formatFecha(selectedLog.creado_en)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>ADMINISTRADOR</span>
                    <strong style={{ fontSize: "0.9rem" }}>{selectedLog.usuario_email}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>USUARIO ID</span>
                    <strong style={{ fontSize: "0.9rem" }}>{selectedLog.usuario_id}</strong>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted" style={{ marginBottom: 4 }}>Metadatos de Cambios (JSON)</p>
                <pre style={{
                  margin: 0,
                  padding: 16,
                  backgroundColor: "#000",
                  color: "#00ff00",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  borderRadius: 4,
                  border: "2px solid #000",
                  overflowX: "auto",
                  maxHeight: 280
                }}>
                  {formatJsonDetails(selectedLog.detalles)}
                </pre>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setSelectedLog(null)}>
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled components custom style overrides for modals */}
      <style dangerouslySetInnerHTML={{ __html: `
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-card {
          background-color: var(--bg-primary);
          border: 4px solid #000;
          box-shadow: 6px 6px 0px #000;
          border-radius: 0px;
          width: 100%;
          padding: 24px;
          position: relative;
          animation: modalAppear 0.2s ease-out;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 3px solid #000;
          padding-bottom: 12px;
        }
        .modal-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          font-weight: 800;
          cursor: pointer;
          padding: 0 4px;
        }
        @keyframes modalAppear {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
