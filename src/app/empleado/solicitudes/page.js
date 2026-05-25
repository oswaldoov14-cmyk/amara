"use client";
import { useState, useEffect } from "react";

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [tipo, setTipo] = useState("Vacaciones");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch previous requests
  async function fetchRequests() {
    try {
      const res = await fetch("/api/solicitudes");
      if (!res.ok) throw new Error("Error al obtener solicitudes");
      const data = await res.json();
      setSolicitudes(data.solicitudes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!tipo || !fechaInicio || !fechaFin) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          motivo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al enviar la solicitud.");
      }

      setSuccess("Tu solicitud ha sido registrada con éxito y está pendiente de revisión.");
      setTipo("Vacaciones");
      setFechaInicio("");
      setFechaFin("");
      setMotivo("");
      fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Format date helper (e.g. "15 de Mayo, 2026")
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "aprobado":
        return <span className="badge badge-green">Aprobado</span>;
      case "rechazado":
        return <span className="badge badge-red">Rechazado</span>;
      default:
        return <span className="badge badge-yellow">Pendiente</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full" style={{ paddingBottom: 40 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Solicitudes de Permisos y Vacaciones</h2>
        <p className="text-secondary text-sm">Crea nuevas solicitudes de ausencia y consulta el estado de las anteriores.</p>
      </div>

      <div className="solicitudes-grid">
        {/* Left Side: Creation Form */}
        <div className="card">
          <h3 className="mb-4 font-semibold" style={{ fontSize: 16 }}>Nueva Solicitud</h3>
          
          <form onSubmit={handleSubmit}>
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

            {success && (
              <div className="alert alert-success mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>{success}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="tipo">Tipo de Ausencia</label>
              <select
                id="tipo"
                className="form-input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              >
                <option value="Vacaciones">Vacaciones</option>
                <option value="Enfermedad">Enfermedad / Incapacidad médica</option>
                <option value="Permiso Con Goce">Permiso con goce de sueldo</option>
                <option value="Permiso Sin Goce">Permiso sin goce de sueldo</option>
                <option value="Otro">Otro motivo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fecha_inicio">Fecha de Inicio</label>
              <input
                id="fecha_inicio"
                type="date"
                className="form-input"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fecha_fin">Fecha de Término</label>
              <input
                id="fecha_fin"
                type="date"
                className="form-input"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="motivo">Motivo / Explicación (Opcional)</label>
              <textarea
                id="motivo"
                className="form-input"
                rows="4"
                placeholder="Detalla brevemente el motivo de tu ausencia..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg mt-4"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  <span>Enviando...</span>
                </>
              ) : (
                "Enviar Solicitud"
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Requests List */}
        <div className="card flex flex-col gap-4">
          <h3 className="font-semibold" style={{ fontSize: 16 }}>Mis Solicitudes Anteriores</h3>

          {loading ? (
            <div className="flex flex-col items-center justify-center" style={{ padding: 40 }}>
              <div className="spinner mb-2"></div>
              <span className="text-secondary text-xs">Cargando solicitudes...</span>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="empty-state text-center" style={{ padding: "60px 20px" }}>
              <div className="empty-state-icon mb-4" style={{ display: "inline-flex", padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: "50%", color: "var(--text-muted)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h4 className="font-semibold text-sm mb-1 text-primary">No tienes solicitudes registradas</h4>
              <p className="text-secondary text-xs">Las solicitudes que realices aparecerán listadas aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 550, paddingRight: 4 }}>
              {solicitudes.map((s) => (
                <div key={s.id} className="card-glass" style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-primary text-sm">{s.tipo}</span>
                      <div className="text-xs text-muted mt-1">
                        Solicitado el: {new Date(s.creado_en).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {getStatusBadge(s.estado)}
                  </div>

                  <div className="text-sm text-secondary mb-3 mt-2" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>
                      Del <strong className="text-primary">{formatFriendlyDate(s.fecha_inicio)}</strong> al <strong className="text-primary">{formatFriendlyDate(s.fecha_fin)}</strong>
                    </span>
                  </div>

                  {s.motivo && (
                    <div style={{ background: "rgba(255,255,255,0.02)", borderLeft: "2px solid var(--border-medium)", padding: "6px 12px", marginBottom: 12 }}>
                      <p className="text-xs text-muted mb-1" style={{ fontWeight: 600 }}>Motivo:</p>
                      <p className="text-xs text-secondary">{s.motivo}</p>
                    </div>
                  )}

                  {s.respuesta_admin && (
                    <div style={{ background: "rgba(37,99,235,0.05)", borderLeft: `2px solid ${s.estado === "aprobado" ? "var(--green-500)" : "var(--red-500)"}`, padding: "8px 12px" }}>
                      <p className="text-xs text-primary" style={{ fontWeight: 700 }}>Respuesta de Administración:</p>
                      <p className="text-xs text-secondary mt-1">{s.respuesta_admin}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .solicitudes-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .solicitudes-grid {
            grid-template-columns: 1fr 1.4fr;
          }
        }
      `}</style>
    </div>
  );
}
