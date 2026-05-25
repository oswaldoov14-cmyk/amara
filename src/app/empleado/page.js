"use client";
import { useEffect, useState } from "react";
import { fechaHoy } from "@/lib/utils";

// Haversine distance calculator helper
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CheckInPage() {
  const [status, setStatus] = useState("loading"); // loading, ready, done
  const [actionType, setActionType] = useState("entrada"); // entrada, salida
  const [todayAsistencia, setTodayAsistencia] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [config, setConfig] = useState(null);
  const [aclaracion, setAclaracion] = useState("");
  const [showAclaracion, setShowAclaracion] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Load configuration and today's attendance status
  async function loadStatus() {
    try {
      const res = await fetch("/api/asistencias");
      if (!res.ok) throw new Error("Error al obtener asistencias");
      const data = await res.json();
      
      const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD
      const todayRecord = data.asistencias.find(a => a.fecha === today);
      
      setTodayAsistencia(todayRecord || null);
      if (data.config) {
        setConfig(data.config);
      }
      
      if (todayRecord) {
        if (todayRecord.hora_entrada && todayRecord.hora_salida) {
          setStatus("done");
        } else if (todayRecord.hora_entrada) {
          setActionType("salida");
          setStatus("ready");
        } else {
          setActionType("entrada");
          setStatus("ready");
        }
      } else {
        setActionType("entrada");
        setStatus("ready");
      }
    } catch (error) {
      console.error("Load status error:", error);
      setAlertMsg({ type: "error", text: "Error al sincronizar datos con el servidor." });
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  // Request HTML5 Geolocation
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!navigator.geolocation) {
      setGpsError("Tu dispositivo o navegador no soporta geolocalización. El acceso a la ubicación es obligatorio.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
        setGpsError(null);
      },
      (error) => {
        console.error("GPS Error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("El permiso de ubicación fue denegado. Para poder registrar tu asistencia, debes permitir el acceso al GPS de forma obligatoria en la configuración de tu navegador.");
        } else {
          setGpsError(`Error de GPS (${error.message}). Por favor activa tu ubicación y recarga la página.`);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Calculate distance when userLocation or config changes
  useEffect(() => {
    if (userLocation && config) {
      const dist = calcularDistancia(
        userLocation.lat,
        userLocation.lng,
        config.lat_trabajo,
        config.lng_trabajo
      );
      setDistance(Math.round(dist));
    }
  }, [userLocation, config]);

  // Handle registration submission
  async function handleRegistration() {
    if (!userLocation) {
      setAlertMsg({ type: "error", text: "No se ha obtenido la señal GPS aún." });
      return;
    }
    setSubmitting(true);
    setAlertMsg(null);
    
    try {
      const res = await fetch("/api/asistencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLocation.lat,
          lng: userLocation.lng,
          tipo: actionType,
          aclaracion: aclaracion || undefined
        })
      });
      
      const data = await res.json();
      
      if (res.status === 422 && data.error === "aclaracion_requerida") {
        setShowAclaracion(true);
        setAlertMsg({
          type: "warning",
          text: data.mensaje || "Has llegado tarde. Ingresa un motivo de retraso antes de registrar tu entrada."
        });
        setSubmitting(false);
        return;
      }
      
      if (!res.ok) {
        setAlertMsg({
          type: "error",
          text: data.mensaje || data.error || "Ocurrió un error al registrar la asistencia."
        });
        setSubmitting(false);
        return;
      }
      
      setAlertMsg({
        type: "success",
        text: `¡Registro exitoso! Se registró tu ${actionType === "entrada" ? "entrada" : "salida"} a las ${data.hora}.`
      });
      
      await loadStatus();
      setShowAclaracion(false);
      setAclaracion("");
    } catch (error) {
      console.error("Submit error:", error);
      setAlertMsg({ type: "error", text: "Error de red al intentar registrar asistencia." });
    } finally {
      setSubmitting(false);
    }
  }

  const isOutOfRange = distance !== null && config && distance > config.radio_metros;
  const isButtonDisabled = submitting || !!gpsError || !userLocation || !config || isOutOfRange || (actionType === "entrada" && showAclaracion && !aclaracion.trim());

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: "50vh" }}>
        <div className="spinner mb-4"></div>
        <p className="text-secondary text-sm">Cargando estado de asistencia...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Alert Banner */}
      {alertMsg && (
        <div className={`alert alert-${alertMsg.type} mb-6 w-full`} style={{ maxWidth: 500 }}>
          {alertMsg.type === "success" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          ) : alertMsg.type === "error" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* GPS Error Block */}
      {gpsError && (
        <div className="alert alert-error mb-6 w-full" style={{ maxWidth: 500 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Ubicación Obligatoria:</strong> {gpsError}
          </div>
        </div>
      )}

      {/* Out of Range Banner */}
      {isOutOfRange && !gpsError && (
        <div className="alert alert-warning mb-6 w-full" style={{ maxWidth: 500 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div>
            <strong>Fuera de las instalaciones:</strong> Estás a {distance} metros de la oficina. Debes estar dentro del rango permitido ({config?.radio_metros} metros) para registrar tu asistencia.
          </div>
        </div>
      )}

      {status === "done" ? (
        <div className="card text-center flex flex-col items-center mb-6 w-full" style={{ maxWidth: 500, padding: 32 }}>
          <div className="badge badge-green mb-4" style={{ fontSize: 14, padding: "6px 16px" }}>
            Jornada Completada
          </div>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--green-500)" strokeWidth="1.5" className="mb-4">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2 className="mb-2 font-bold" style={{ fontSize: 20 }}>¡Buen trabajo!</h2>
          <p className="text-secondary text-sm mb-4">Ya has registrado tanto la entrada como la salida correspondientes al día de hoy.</p>
          
          <div className="w-full" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
            <div className="flex justify-between mb-2">
              <span className="text-muted text-sm">Entrada:</span>
              <span className="font-semibold text-sm">{todayAsistencia?.hora_entrada} hrs</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted text-sm">Salida:</span>
              <span className="font-semibold text-sm">{todayAsistencia?.hora_salida} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">Horas Laboradas:</span>
              <span className="badge badge-blue">{todayAsistencia?.horas_trabajadas || 0} hrs</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          {/* Geolocation Status Indicator */}
          <div className="gps-status mb-6">
            <span className={`gps-dot ${gpsError ? "gps-dot-error" : !userLocation ? "gps-dot-searching" : "gps-dot-ok"}`}></span>
            <span>
              {gpsError 
                ? "GPS inactivo" 
                : !userLocation 
                  ? "Buscando señal GPS..." 
                  : `GPS conectado (Precisión: ±${Math.round(userLocation.accuracy)}m)`}
            </span>
          </div>

          {/* Location Ring and Action Button */}
          <div className="location-ring mb-6">
            <div className="location-ring-outer"></div>
            <div className="location-ring-inner"></div>
            {distance !== null && config && distance <= config.radio_metros && (
              <div className="location-dot-work" style={{ top: "35px", right: "45px" }}></div>
            )}
            <button
              disabled={isButtonDisabled}
              onClick={handleRegistration}
              className={`checkin-btn ${actionType === "entrada" ? "checkin-btn-entrada" : "checkin-btn-salida"} ${!isButtonDisabled ? "checkin-btn-pulse" : ""}`}
            >
              {submitting ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{actionType === "entrada" ? "Registrar Entrada" : "Registrar Salida"}</span>
                </>
              )}
            </button>
          </div>

          {/* Distance Indicator */}
          {distance !== null && config && (
            <div className="mb-6 text-center">
              <span className={`badge ${isOutOfRange ? "badge-red" : "badge-green"}`} style={{ fontSize: 13, padding: "6px 12px" }}>
                Distancia a oficina: {distance}m {isOutOfRange ? `(Rango excedido por ${distance - config.radio_metros}m)` : `(Dentro del límite de ${config.radio_metros}m)`}
              </span>
            </div>
          )}

          {/* Aclaración text area for late check-in */}
          {actionType === "entrada" && showAclaracion && (
            <div className="card mb-6 w-full" style={{ maxWidth: 500 }}>
              <h3 className="mb-2 font-bold flex items-center gap-2" style={{ fontSize: 16 }}>
                ⚠️ JUSTIFICACIÓN DE RETRASO (OBLIGATORIO)
              </h3>
              <p className="text-secondary text-sm mb-4">
                Has superado la hora oficial de entrada. Por favor explica el motivo para habilitar el registro:
              </p>
              <textarea
                value={aclaracion}
                onChange={(e) => setAclaracion(e.target.value)}
                placeholder="Escribe el motivo detallado de tu retraso aquí..."
                className="form-input"
                style={{ minHeight: 100, resize: "vertical" }}
                disabled={submitting}
              />
              <button
                disabled={submitting || !aclaracion.trim()}
                onClick={handleRegistration}
                className="btn btn-success btn-full"
                style={{ marginTop: 16 }}
              >
                {submitting ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Enviar Solicitud de Entrada</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Current Details Card */}
          <div className="card w-full" style={{ maxWidth: 500 }}>
            <h3 className="mb-4 font-semibold text-center" style={{ fontSize: 16 }}>Resumen de Registro de Hoy</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 10 }}>
                <span className="text-secondary text-sm">Fecha:</span>
                <span className="font-semibold text-sm">{new Date().toLocaleDateString("es-ES", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex justify-between items-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 10 }}>
                <span className="text-secondary text-sm">Hora de entrada:</span>
                {todayAsistencia?.hora_entrada ? (
                  <span className="badge badge-green">{todayAsistencia.hora_entrada} hrs</span>
                ) : (
                  <span className="badge badge-gray">Pendiente</span>
                )}
              </div>
              <div className="flex justify-between items-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 10 }}>
                <span className="text-secondary text-sm">Estado de entrada:</span>
                {todayAsistencia?.estado ? (
                  <span className={`badge ${todayAsistencia.estado === "Tarde" ? "badge-yellow" : "badge-green"}`}>
                    {todayAsistencia.estado}
                  </span>
                ) : (
                  <span className="badge badge-gray">—</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary text-sm">Hora de salida:</span>
                {todayAsistencia?.hora_salida ? (
                  <span className="badge badge-blue">{todayAsistencia.hora_salida} hrs</span>
                ) : (
                  <span className="badge badge-gray">Pendiente</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
