"use client";
import { useState, useEffect } from "react";

export default function HistorialPage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [asistencias, setAsistencias] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize selectedMonth with current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${year}-${month}`);
  }, []);

  // Fetch data when month changes
  useEffect(() => {
    if (!selectedMonth) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [asistenciasRes, solicitudesRes] = await Promise.all([
          fetch(`/api/asistencias?mes=${selectedMonth}`),
          fetch(`/api/solicitudes`)
        ]);

        if (!asistenciasRes.ok || !solicitudesRes.ok) {
          throw new Error("Error al obtener datos");
        }

        const asistenciasData = await asistenciasRes.json();
        const solicitudesData = await solicitudesRes.json();

        setAsistencias(asistenciasData.asistencias || []);
        setSolicitudes(solicitudesData.solicitudes || []);
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedMonth]);

  // Calendar properties
  const getCalendarCells = () => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed for Date constructor

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Get first day's weekday index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    let startOffset = firstDay.getDay();
    // Adjust offset to Monday-start (0 = Monday, ..., 5 = Saturday, 6 = Sunday)
    if (startOffset === 0) startOffset = 6;
    else startOffset = startOffset - 1;

    const cells = [];
    // Padding for days before the 1st
    for (let i = 0; i < startOffset; i++) {
      cells.push({ type: "empty" });
    }
    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      cells.push({ type: "day", day });
    }
    // Pad the grid to multiple of 7 (35 or 42 cells)
    const targetSize = cells.length > 35 ? 42 : 35;
    while (cells.length < targetSize) {
      cells.push({ type: "empty" });
    }

    return cells;
  };

  // Stats calculation
  const calculateStats = () => {
    if (!selectedMonth) return { asistenciasCount: 0, tardesCount: 0, faltasCount: 0, vacacionesCount: 0, descansosCount: 0 };
    
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const now = new Date();
    const todayStr = now.toLocaleDateString("sv"); // YYYY-MM-DD
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    let asistenciasCount = 0;
    let tardesCount = 0;
    let faltasCount = 0;
    let vacacionesCount = 0;
    let descansosCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, "0");
      const cellDateStr = `${selectedMonth}-${dayStr}`;

      // Only count days in the past or today
      if (cellDateStr <= todayStr) {
        const record = asistencias.find(a => a.fecha === cellDateStr);
        const request = solicitudes.find(s => 
          s.estado === "aprobado" && 
          cellDateStr >= s.fecha_inicio && 
          cellDateStr <= s.fecha_fin
        );

        if (record) {
          asistenciasCount++;
          if (record.estado === "Tarde") {
            tardesCount++;
          }
        } else if (request) {
          if (request.tipo.toLowerCase().includes("vacacion")) {
            vacacionesCount++;
          } else {
            descansosCount++;
          }
        } else {
          // Past day with no record or request
          const weekday = new Date(year, month, day).getDay(); // 0=Sunday
          if (weekday === 0) {
            descansosCount++; // Sunday rest
          } else {
            faltasCount++; // Absences on workdays
          }
        }
      }
    }

    return { asistenciasCount, tardesCount, faltasCount, vacacionesCount, descansosCount };
  };

  const cells = getCalendarCells();
  const { asistenciasCount, tardesCount, faltasCount, vacacionesCount, descansosCount } = calculateStats();
  const todayStr = new Date().toLocaleDateString("sv");

  // Format month to Spanish name (e.g. "Mayo 2026")
  const getSpanishMonthName = () => {
    if (!selectedMonth) return "";
    const [yearStr, monthStr] = selectedMonth.split("-");
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 w-full" style={{ paddingBottom: 40 }}>
      {/* Header and month filter */}
      <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Historial de Asistencia</h2>
          <p className="text-secondary text-sm">Consulta tus registros, faltas y justificaciones.</p>
        </div>
        <div className="form-group mb-0" style={{ minWidth: 200 }}>
          <label className="form-label" htmlFor="month-select">Selecciona el mes:</label>
          <input
            id="month-select"
            type="month"
            className="form-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "40vh" }}>
          <div className="spinner mb-4"></div>
          <p className="text-secondary text-sm">Cargando historial...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card" style={{ "--accent-color": "var(--green-500)" }}>
              <div className="stat-icon" style={{ background: "rgba(34,197,94,0.15)", color: "var(--green-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="stat-value">{asistenciasCount}</div>
              <div className="stat-label">Asistencias</div>
            </div>

            <div className="stat-card" style={{ "--accent-color": "var(--yellow-500)" }}>
              <div className="stat-icon" style={{ background: "rgba(234,179,8,0.15)", color: "var(--yellow-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="stat-value">{tardesCount}</div>
              <div className="stat-label">Tardes</div>
            </div>

            <div className="stat-card" style={{ "--accent-color": "var(--red-500)" }}>
              <div className="stat-icon" style={{ background: "rgba(239,68,68,0.15)", color: "var(--red-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="stat-value">{faltasCount}</div>
              <div className="stat-label">Faltas</div>
            </div>

            <div className="stat-card" style={{ "--accent-color": "var(--purple-500)" }}>
              <div className="stat-icon" style={{ background: "rgba(168,85,247,0.15)", color: "var(--purple-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div className="stat-value">{vacacionesCount}</div>
              <div className="stat-label">Vacaciones</div>
            </div>

            <div className="stat-card" style={{ "--accent-color": "var(--blue-500)" }}>
              <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "var(--blue-400)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <div className="stat-value">{descansosCount}</div>
              <div className="stat-label">Descansos</div>
            </div>
          </div>

          {/* Calendar and Detailed List Area */}
          <div className="history-details-grid">
            {/* Calendar Card */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Calendario de {getSpanishMonthName()}</h3>
                <div className="flex gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--green-500)" }}></span> A Tiempo</span>
                  <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--yellow-500)" }}></span> Retraso</span>
                  <span className="flex items-center gap-1"><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--red-500)" }}></span> Falta</span>
                </div>
              </div>

              {/* Day Labels */}
              <div className="calendar-grid mb-2">
                <div className="calendar-day-header">Lun</div>
                <div className="calendar-day-header">Mar</div>
                <div className="calendar-day-header">Mié</div>
                <div className="calendar-day-header">Jue</div>
                <div className="calendar-day-header">Vie</div>
                <div className="calendar-day-header">Sáb</div>
                <div className="calendar-day-header">Dom</div>
              </div>

              {/* Day Cells */}
              <div className="calendar-grid">
                {cells.map((cell, idx) => {
                  if (cell.type === "empty") {
                    return <div key={`empty-${idx}`} className="calendar-day calendar-day-empty" />;
                  }

                  const [yearStr, monthStr] = selectedMonth.split("-");
                  const year = parseInt(yearStr);
                  const month = parseInt(monthStr) - 1;
                  const dayStr = String(cell.day).padStart(2, "0");
                  const cellDateStr = `${selectedMonth}-${dayStr}`;

                  const isCellFuture = cellDateStr > todayStr;
                  const isCellToday = cellDateStr === todayStr;

                  let cellClass = "calendar-day ";
                  let tooltip = `Fecha: ${cell.day}/${monthStr}/${yearStr}`;

                  if (isCellFuture) {
                    cellClass += "calendar-day-futuro";
                  } else {
                    const record = asistencias.find(a => a.fecha === cellDateStr);
                    const request = solicitudes.find(s => 
                      s.estado === "aprobado" && 
                      cellDateStr >= s.fecha_inicio && 
                      cellDateStr <= s.fecha_fin
                    );

                    if (record) {
                      if (record.estado === "A tiempo") {
                        cellClass += "calendar-day-presente";
                        tooltip += `\nEntrada: ${record.hora_entrada} hrs\nSalida: ${record.hora_salida || 'No registrada'}`;
                      } else {
                        cellClass += "calendar-day-tarde";
                        tooltip += `\nEntrada (Retraso): ${record.hora_entrada} hrs\nSalida: ${record.hora_salida || 'No registrada'}`;
                        if (record.aclaracion) {
                          tooltip += `\nJustificación: ${record.aclaracion}`;
                        }
                      }
                    } else if (request) {
                      if (request.tipo.toLowerCase().includes("vacacion")) {
                        cellClass += "calendar-day-vacaciones";
                        tooltip += `\nVacaciones aprobadas: ${request.motivo || 'Sin especificar'}`;
                      } else {
                        cellClass += "calendar-day-descanso";
                        tooltip += `\nPermiso/Descanso aprobado: ${request.motivo || 'Sin especificar'}`;
                      }
                    } else {
                      const dayOfWeek = new Date(year, month, cell.day).getDay(); // 0 = Sunday
                      if (dayOfWeek === 0) {
                        cellClass += "calendar-day-descanso";
                        tooltip += `\nDía de descanso semanal`;
                      } else {
                        cellClass += "calendar-day-falta";
                        tooltip += `\nInasistencia registrada`;
                      }
                    }
                  }

                  if (isCellToday) {
                    cellClass += " calendar-day-hoy";
                  }

                  return (
                    <div
                      key={`day-${cell.day}`}
                      className={cellClass}
                      title={tooltip}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed List Card */}
            <div className="card">
              <h3 className="mb-4 font-semibold" style={{ fontSize: 16 }}>Registros del Mes</h3>
              
              {asistencias.length === 0 ? (
                <div className="empty-state text-center" style={{ padding: "40px 20px" }}>
                  <div className="empty-state-icon mb-4" style={{ display: "inline-flex", padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: "50%", color: "var(--text-muted)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="9" x2="15" y2="9"/>
                      <line x1="9" y1="13" x2="15" y2="13"/>
                      <line x1="9" y1="17" x2="13" y2="17"/>
                    </svg>
                  </div>
                  <h4 className="font-semibold text-sm mb-1 text-primary">Sin asistencia registrada</h4>
                  <p className="text-secondary text-xs">No hay marcajes de entrada o salida para este mes todavía.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Horas</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistencias.map((a) => {
                        const dateObj = new Date(a.fecha + "T00:00:00");
                        const dayName = dateObj.toLocaleDateString("es-ES", { weekday: 'short' });
                        const formattedDate = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateObj.getDate()}`;
                        
                        return (
                          <tr key={a.id}>
                            <td className="font-semibold text-primary">{formattedDate}</td>
                            <td>
                              {a.hora_entrada ? (
                                <span className="text-sm font-semibold">{a.hora_entrada}</span>
                              ) : (
                                <span className="text-muted text-xs">—</span>
                              )}
                            </td>
                            <td>
                              {a.hora_salida ? (
                                <span className="text-sm font-semibold">{a.hora_salida}</span>
                              ) : (
                                <span className="text-muted text-xs">—</span>
                              )}
                            </td>
                            <td>
                              {a.horas_trabajadas > 0 ? (
                                <span className="badge badge-blue">{a.horas_trabajadas} hrs</span>
                              ) : (
                                <span className="text-muted text-xs">—</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${a.estado === "Tarde" ? "badge-yellow" : "badge-green"}`}>
                                {a.estado}
                              </span>
                              {a.aclaracion && (
                                <div className="text-xs text-muted mt-1" style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.aclaracion}>
                                  💬 {a.aclaracion}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .history-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 1024px) {
          .history-details-grid {
            grid-template-columns: 1.2fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
