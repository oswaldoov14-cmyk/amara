"use client";

import { useEffect, useState } from "react";

export default function AdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tab control: "accesos" | "pendientes" | "historial"
  const [activeTab, setActiveTab] = useState("accesos");
  
  // Admin replies state mapping for leave requests: { [solicitudId]: "reply text" }
  const [respuestas, setRespuestas] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Success/error messages for action feedback
  const [actionMessage, setActionMessage] = useState(null);

  // Modal states for access request configuration
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states for approval modal
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [sueldoDiario, setSueldoDiario] = useState("300");
  const [horarioEntrada, setHorarioEntrada] = useState("09:00");
  const [horarioSalida, setHorarioSalida] = useState("18:00");
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  async function fetchSolicitudes() {
    setLoading(true);
    setError("");
    try {
      const [resSol, resEmp] = await Promise.all([
        fetch("/api/solicitudes"),
        fetch("/api/admin/empleados"),
      ]);

      if (!resSol.ok || !resEmp.ok) {
        throw new Error("Error al cargar solicitudes");
      }

      const dataSol = await resSol.json();
      const dataEmp = await resEmp.json();

      setSolicitudes(dataSol.solicitudes || []);
      setPendientes(dataEmp.pendientes || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const handleReplyChange = (id, text) => {
    setRespuestas((prev) => ({ ...prev, [id]: text }));
  };

  // Process leave/absence requests (approve/reject)
  const handleAction = async (id, estado) => {
    setActionLoadingId(id);
    setActionMessage(null);
    const respuestaAdmin = respuestas[id] || "";

    try {
      const res = await fetch("/api/solicitudes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          estado,
          respuesta_admin: respuestaAdmin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: "error", text: data.error || "Error al procesar la solicitud" });
        setActionLoadingId(null);
        return;
      }

      // Success feedback
      setActionMessage({
        type: "success",
        text: `Solicitud ${estado === "aprobada" ? "aprobada" : "rechazada"} con éxito`,
      });

      // Clear reply state for this card
      setRespuestas((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // Refresh data
      await fetchSolicitudes();
      
      // Clear notification after 3 seconds
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Access Request (Delete pending user registration)
  const handleRejectAccess = async (id) => {
    if (!confirm("¿Estás seguro de que deseas rechazar y eliminar esta solicitud de acceso?")) return;
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionMessage({
          type: "success",
          text: "Solicitud de acceso rechazada y eliminada con éxito.",
        });
        await fetchSolicitudes();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        const data = await res.json();
        setActionMessage({ type: "error", text: data.error || "Error al rechazar la solicitud" });
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open modal for approving and configuring a pending user
  function openApproveModal(user) {
    setSelectedUser(user);
    setNombre(user.nombre);
    setEmail(user.email);
    setSueldoDiario("300"); // default starting daily wage
    setHorarioEntrada("09:00");
    setHorarioSalida("18:00");
    setActivo(true);
    setFormError("");
    setFormSuccess("");
    setModalOpen(true);
  }

  // Handle Approve Submit Form
  async function handleApproveSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    const payload = {
      id: selectedUser.id,
      nombre,
      sueldo_diario: parseFloat(sueldoDiario),
      horario_entrada: horarioEntrada,
      horario_salida: horarioSalida,
      activo: activo ? 1 : 0,
    };

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Ocurrió un error al procesar la solicitud");
        setFormLoading(false);
        return;
      }

      setFormSuccess("Usuario aprobado y configurado con éxito");
      setFormLoading(false);
      
      // Refresh lists
      await fetchSolicitudes();

      // Close modal after delay
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError("Error de conexión con el servidor");
      setFormLoading(false);
    }
  }

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case "vacaciones":
        return "Vacaciones";
      case "permiso":
        return "Permiso Especial";
      case "enfermedad":
        return "Licencia Médica";
      case "falta_justificada":
        return "Justificación de Falta";
      default:
        return tipo;
    }
  };

  const getTipoBadgeClass = (tipo) => {
    switch (tipo) {
      case "vacaciones":
        return "badge-purple";
      case "permiso":
        return "badge-blue";
      case "enfermedad":
        return "badge-yellow";
      case "falta_justificada":
        return "badge-green";
      default:
        return "badge-gray";
    }
  };

  // Filter requests
  const pendingRequests = solicitudes.filter((s) => s.estado === "pendiente");
  const historyRequests = solicitudes.filter((s) => s.estado !== "pendiente");

  return (
    <div>
      {/* Tab Selectors */}
      <div className="card mb-6" style={{ padding: "12px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className={`btn ${activeTab === "accesos" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setActiveTab("accesos")}
            style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            🔑 Solicitudes de Acceso ({pendientes.length})
          </button>
          <button
            className={`btn ${activeTab === "pendientes" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setActiveTab("pendientes")}
            style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            📋 Permisos Pendientes ({pendingRequests.length})
          </button>
          <button
            className={`btn ${activeTab === "historial" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setActiveTab("historial")}
            style={{ flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            📜 Historial de Permisos ({historyRequests.length})
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`alert alert-${actionMessage.type} mb-4`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {actionMessage.type === "success" ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            ) : (
              <circle cx="12" cy="12" r="10" />
            )}
            {actionMessage.type === "success" ? (
              <polyline points="22 4 12 14.01 9 11.01" />
            ) : (
              <>
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          {actionMessage.text}
        </div>
      )}

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : activeTab === "accesos" ? (
        // ACCESS REQUESTS TAB
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pendientes.length === 0 ? (
            <div className="card text-center" style={{ padding: "48px 0" }}>
              <div className="empty-state">
                <div className="empty-state-icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--green-400)", border: "2px solid #000000", borderRadius: "8px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p>No hay solicitudes de acceso pendientes.</p>
              </div>
            </div>
          ) : (
            pendientes.map((emp) => (
              <div key={emp.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3 className="section-title" style={{ fontSize: 18 }}>
                      {emp.nombre}
                    </h3>
                    <p className="text-xs text-secondary" style={{ fontWeight: 800 }}>
                      Correo: {emp.email}
                    </p>
                  </div>
                  <span className="badge badge-purple">
                    Pendiente Aprobación
                  </span>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <p className="text-xs text-muted mb-2">REGISTRO DE USUARIO</p>
                  <p className="text-sm">
                    <strong>Fecha de registro:</strong>{" "}
                    {emp.creado_en 
                      ? new Date(emp.creado_en.replace(" ", "T") + "Z").toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : "No disponible"}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRejectAccess(emp.id)}
                    disabled={actionLoadingId === emp.id}
                  >
                    {actionLoadingId === emp.id && <span className="spinner" />}
                    Rechazar Solicitud
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => openApproveModal(emp)}
                    disabled={actionLoadingId === emp.id}
                  >
                    Aprobar y Configurar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === "pendientes" ? (
        // PENDING ABSENCE REQUESTS TAB
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pendingRequests.length === 0 ? (
            <div className="card text-center" style={{ padding: "48px 0" }}>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p>No hay solicitudes pendientes de aprobación.</p>
              </div>
            </div>
          ) : (
            pendingRequests.map((sol) => (
              <div key={sol.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3 className="section-title" style={{ fontSize: 16 }}>
                      {sol.nombre}
                    </h3>
                    <p className="text-xs text-secondary">{sol.email}</p>
                  </div>
                  <span className={`badge ${getTipoBadgeClass(sol.tipo)}`}>
                    {getTipoLabel(sol.tipo)}
                  </span>
                </div>

                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <p className="text-xs text-muted mb-2">DETALLE Y MOTIVO</p>
                  <div style={{ display: "flex", gap: 32, marginBottom: 8 }} className="text-sm">
                    <div>
                      <strong>Inicio:</strong> {sol.fecha_inicio}
                    </div>
                    <div>
                      <strong>Fin:</strong> {sol.fecha_fin}
                    </div>
                  </div>
                  <p className="text-sm" style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                    &ldquo;{sol.motivo || "No se especificó motivo"}&rdquo;
                  </p>
                </div>

                {/* admin actions */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Comentarios o Respuesta (opcional):</label>
                  <textarea
                    rows="2"
                    className="form-input"
                    placeholder="Escriba aquí el motivo de la aprobación, rechazo o indicaciones..."
                    value={respuestas[sol.id] || ""}
                    onChange={(e) => handleReplyChange(sol.id, e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleAction(sol.id, "rechazada")}
                    disabled={actionLoadingId === sol.id}
                  >
                    {actionLoadingId === sol.id && <span className="spinner" />}
                    Rechazar
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleAction(sol.id, "aprobada")}
                    disabled={actionLoadingId === sol.id}
                  >
                    {actionLoadingId === sol.id && <span className="spinner" />}
                    Aprobar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // HISTORY TAB
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {historyRequests.length === 0 ? (
            <div className="card text-center" style={{ padding: "48px 0" }}>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p>El historial de solicitudes está vacío.</p>
              </div>
            </div>
          ) : (
            historyRequests.map((sol) => {
              const isApproved = sol.estado === "aprobada";
              return (
                <div
                  key={sol.id}
                  className="card"
                  style={{
                    borderColor: isApproved ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <h3 className="section-title" style={{ fontSize: 16 }}>
                        {sol.nombre}
                      </h3>
                      <p className="text-xs text-secondary">{sol.email}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className={`badge ${getTipoBadgeClass(sol.tipo)}`}>
                        {getTipoLabel(sol.tipo)}
                      </span>
                      <span className={`badge ${isApproved ? "badge-green" : "badge-red"}`}>
                        {isApproved ? "Aprobada" : "Rechazada"}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm mb-3">
                    <span className="text-muted">Período: </span>
                    <strong>{sol.fecha_inicio}</strong> al <strong>{sol.fecha_fin}</strong>
                  </div>

                  <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                    <span className="text-muted">Motivo:</span> &ldquo;{sol.motivo || "No especificado"}&rdquo;
                  </p>

                  {sol.respuesta_admin && (
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        borderLeft: `3px solid ${isApproved ? "var(--green-500)" : "var(--red-500)"}`,
                        padding: "10px 14px",
                        borderRadius: "0 6px 6px 0",
                        fontSize: 13,
                        marginTop: 12,
                      }}
                    >
                      <strong>Respuesta admin:</strong> {sol.respuesta_admin}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Approve Access Request Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="section-header mb-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="section-title" style={{ fontSize: 20 }}>
                Aprobar y Configurar Empleado
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", padding: 0 }}
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApproveSubmit}>
              {formError && <div className="alert alert-error mb-4">{formError}</div>}
              {formSuccess && <div className="alert alert-success mb-4">{formSuccess}</div>}

              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  disabled
                  style={{ background: "#f4f4f5", cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sueldo Diario (MXN)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder="300.00"
                  value={sueldoDiario}
                  onChange={(e) => setSueldoDiario(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Horario Entrada</label>
                  <input
                    type="time"
                    className="form-input"
                    value={horarioEntrada}
                    onChange={(e) => setHorarioEntrada(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Horario Salida</label>
                  <input
                    type="time"
                    className="form-input"
                    value={horarioSalida}
                    onChange={(e) => setHorarioSalida(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Habilitar inicio de sesión (Empleado Activo)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success" disabled={formLoading}>
                  {formLoading ? <span className="spinner" /> : null}
                  Confirmar Aprobación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
