"use client";

import { useEffect, useState } from "react";

export default function AdminConfiguracion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [latTrabajo, setLatTrabajo] = useState("");
  const [lngTrabajo, setLngTrabajo] = useState("");
  const [radioMetros, setRadioMetros] = useState("");
  const [horarioEntrada, setHorarioEntrada] = useState("");
  const [horarioSalida, setHorarioSalida] = useState("");
  const [tarifaHoraExtra, setTarifaHoraExtra] = useState("");

  // GPS geolocation support state
  const [gpsError, setGpsError] = useState("");

  async function fetchConfig() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/configuracion");
      if (!res.ok) throw new Error("Error al obtener la configuración");
      const data = await res.json();
      if (data.config) {
        setLatTrabajo(data.config.lat_trabajo?.toString() || "");
        setLngTrabajo(data.config.lng_trabajo?.toString() || "");
        setRadioMetros(data.config.radio_metros?.toString() || "");
        setHorarioEntrada(data.config.horario_entrada?.slice(0, 5) || "09:00");
        setHorarioSalida(data.config.horario_salida?.slice(0, 5) || "18:00");
        setTarifaHoraExtra(data.config.tarifa_hora_extra?.toString() || "1.5");
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la configuración del sistema.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleGetCurrentLocation = () => {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("La geolocalización no es soportada por su navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatTrabajo(position.coords.latitude.toFixed(7));
        setLngTrabajo(position.coords.longitude.toFixed(7));
        setSuccess("Ubicación GPS obtenida con éxito (Recuerde guardar los cambios).");
        setTimeout(() => setSuccess(""), 4000);
      },
      (err) => {
        console.error(err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError("Permiso denegado por el usuario.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError("Ubicación no disponible.");
            break;
          case err.TIMEOUT:
            setGpsError("Tiempo de espera agotado.");
            break;
          default:
            setGpsError("Error al obtener ubicación.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const payload = {
      lat_trabajo: parseFloat(latTrabajo),
      lng_trabajo: parseFloat(lngTrabajo),
      radio_metros: parseFloat(radioMetros),
      horario_entrada: horarioEntrada,
      horario_salida: horarioSalida,
      tarifa_hora_extra: parseFloat(tarifaHoraExtra),
    };

    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar la configuración");
      }

      setSuccess("Configuración del sistema guardada con éxito.");
      setSubmitting(false);
      
      // Auto-clear success message
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error de red al actualizar configuración");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }} className="grid-cols-desktop">
        {/* Left Column - Configuration Form */}
        <div className="card">
          <div className="section-header mb-4">
            <h2 className="section-title">Parámetros del Sistema</h2>
            <p className="section-subtitle">Defina la ubicación de la empresa, horarios y tarifas de pago</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Geolocation Section */}
            <h3 className="text-sm font-semibold mb-3 text-secondary" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6 }}>
              Ubicación y Geocerca (Geofencing)
            </h3>

            <div style={{ display: "flex", gap: 16 }} className="flex-col-mobile">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Latitud</label>
                <input
                  type="number"
                  step="0.0000001"
                  className="form-input"
                  placeholder="Ej. 20.6736"
                  value={latTrabajo}
                  onChange={(e) => setLatTrabajo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Longitud</label>
                <input
                  type="number"
                  step="0.0000001"
                  className="form-input"
                  placeholder="Ej. -103.344"
                  value={lngTrabajo}
                  onChange={(e) => setLngTrabajo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Radio de Tolerancia (Metros)</label>
              <input
                type="number"
                min="5"
                className="form-input"
                placeholder="Ej. 100"
                value={radioMetros}
                onChange={(e) => setRadioMetros(e.target.value)}
                required
              />
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Distancia máxima permitida en metros a la redonda para registrar asistencia.
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleGetCurrentLocation}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Usar mi ubicación GPS actual
              </button>
              {gpsError && (
                <p className="form-error" style={{ textAlign: "center", marginTop: 4 }}>
                  {gpsError}
                </p>
              )}
            </div>

            {/* Official Work hours */}
            <h3 className="text-sm font-semibold mb-3 text-secondary" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6, marginTop: 24 }}>
              Jornada Laboral Oficial
            </h3>

            <div style={{ display: "flex", gap: 16 }} className="flex-col-mobile">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Hora de Entrada (HH:MM)</label>
                <input
                  type="time"
                  className="form-input"
                  value={horarioEntrada}
                  onChange={(e) => setHorarioEntrada(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Hora de Salida (HH:MM)</label>
                <input
                  type="time"
                  className="form-input"
                  value={horarioSalida}
                  onChange={(e) => setHorarioSalida(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Overtime Policy */}
            <h3 className="text-sm font-semibold mb-3 text-secondary" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6, marginTop: 24 }}>
              Políticas de Nómina y Horas Extra
            </h3>

            <div className="form-group">
              <label className="form-label">Multiplicador de Hora Extra</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                className="form-input"
                placeholder="Ej. 1.5"
                value={tarifaHoraExtra}
                onChange={(e) => setTarifaHoraExtra(e.target.value)}
                required
              />
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Multiplicador aplicado al valor de la hora ordinaria (Ej. 1.5 es 50% extra).
              </p>
            </div>

            <div style={{ marginTop: 32 }}>
              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={submitting}
              >
                {submitting ? <span className="spinner" /> : null}
                {submitting ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Geofence Status Ring Animation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
            <h3 className="section-title mb-4">Estado de Geolocalización</h3>
            
            <div className="location-ring mb-4">
              <div className="location-ring-outer" />
              <div className="location-ring-inner" />
              <div className="location-dot-work" />
            </div>

            <p className="text-sm font-bold" style={{ color: "var(--blue-400)", marginBottom: 8 }}>
              Geocerca Activa ({radioMetros} metros)
            </p>
            <p className="text-xs text-muted" style={{ maxWidth: 280 }}>
              Cualquier registro de entrada o salida fuera de este rango de distancia desde las coordenadas ({latTrabajo || "0.0"}, {lngTrabajo || "0.0"}) será restringido o alertado por el sistema.
            </p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Instrucciones de Configuración</h4>
            <ul className="text-xs text-secondary" style={{ paddingLeft: 16, lineHeight: "1.8" }}>
              <li>Para obtener la coordenada exacta de sus oficinas o centro de trabajo, puede posicionarse físicamente ahí y presionar el botón "Usar mi ubicación GPS actual" desde su dispositivo móvil o laptop.</li>
              <li>El radio de tolerancia define qué tan lejos de la coordenada de origen puede estar un empleado para registrarse. Recomendamos un mínimo de 25-50 metros para compensar la imprecisión del GPS en interiores.</li>
              <li>El horario oficial y las horas extras se calcularán de manera automática al procesar la nómina semanal.</li>
            </ul>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .grid-cols-desktop {
            grid-template-columns: 1.4fr 1fr !important;
          }
        }
        @media (max-width: 576px) {
          .flex-col-mobile {
            flex-direction: column !important;
          }
        }
      `}} />
    </div>
  );
}
