"use client";

import { useEffect, useState } from "react";

export default function AdminNomina() {
  const [nominas, setNominas] = useState([]);
  const [semana, setSemana] = useState({ inicio: "", fin: "" });
  const [semanaInicio, setSemanaInicio] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal receipt states
  const [selectedNomina, setSelectedNomina] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Snaps any date to its Monday
  function getLunes(fechaInput) {
    const d = new Date(fechaInput);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString("sv"); // YYYY-MM-DD
  }

  // Set default week to current Monday on mount
  useEffect(() => {
    const today = new Date();
    const monday = getLunes(today);
    setSemanaInicio(monday);
  }, []);

  // Fetch weekly payroll data
  async function fetchPayroll() {
    if (!semanaInicio) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/empleados?vista=nomina&semana_inicio=${semanaInicio}`);
      if (!res.ok) {
        throw new Error("Error al obtener la nómina");
      }
      const data = await res.json();
      setNominas(data.nominas || []);
      setSemana(data.semana || { inicio: semanaInicio, fin: "" });
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el cálculo de nómina.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayroll();
  }, [semanaInicio]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (val) {
      // Adding time to prevent time zone issues
      const snappedMonday = getLunes(val + "T12:00:00");
      setSemanaInicio(snappedMonday);
    }
  };

  const openReceipt = (nom) => {
    setSelectedNomina(nom);
    setModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Styles for printing only the receipt */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .only-print {
              display: none !important;
            }
            @media print {
              .only-print {
                display: grid !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
              .app-layout {
                display: block !important;
                padding: 0 !important;
                min-height: auto !important;
              }
              .main-content {
                padding: 0 !important;
                padding-bottom: 0 !important;
              }
              header.topbar, 
              aside.sidebar, 
              nav.mobile-nav, 
              .card:not(#print-receipt), 
              .no-print,
              button,
              .modal-overlay {
                display: none !important;
              }
              .modal-overlay {
                position: relative !important;
                inset: auto !important;
                background: none !important;
                backdrop-filter: none !important;
                display: block !important;
                padding: 0 !important;
                z-index: auto !important;
                animation: none !important;
              }
              #print-receipt {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                animation: none !important;
              }
              .payroll-card {
                background: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
              }
              .payroll-row {
                border-bottom: 1px solid #ccc !important;
                color: black !important;
              }
              .payroll-amount, .payroll-amount-green, .payroll-amount-red, .payroll-amount-total {
                color: black !important;
              }
              .text-muted, .text-secondary {
                color: #555 !important;
              }
            }
          `,
        }}
      />

      {/* Date selector and Title header */}
      <div className="card mb-6 no-print">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <h3 className="section-title">Selección de Período</h3>
            <p className="section-subtitle">
              Seleccione cualquier día para calcular la nómina de esa semana (lunes a sábado)
            </p>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 220 }}>
            <label className="form-label" htmlFor="week-select">
              Semana del Lunes:
            </label>
            <input
              id="week-select"
              type="date"
              className="form-input"
              value={semanaInicio}
              onChange={handleDateChange}
              required
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Resumen de Nómina Semanal</h2>
              <p className="section-subtitle">
                Período: Lunes <strong>{semana.inicio}</strong> al Sábado <strong>{semana.fin}</strong>
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Sueldo Diario</th>
                  <th style={{ textAlign: "center" }}>Trabajados</th>
                  <th style={{ textAlign: "center" }}>Faltas</th>
                  <th style={{ textAlign: "center" }}>Hrs Extra</th>
                  <th>Sueldo Base</th>
                  <th>Pago Hrs Extra</th>
                  <th>Deducciones</th>
                  <th>Total Neto</th>
                  <th style={{ textAlign: "right" }}>Recibo</th>
                </tr>
              </thead>
              <tbody>
                {nominas.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center" style={{ padding: "40px 0" }}>
                      No hay empleados para calcular nómina en este período.
                    </td>
                  </tr>
                ) : (
                  nominas.map((nom) => (
                    <tr key={nom.empleado.id}>
                      <td>
                        <div className="table-name">
                          <div>
                            <strong>{nom.empleado.nombre}</strong>
                            <div className="text-xs text-muted">{nom.empleado.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>${nom.empleado.sueldo_diario?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "center" }}>{nom.nomina.diasTrabajados} d</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ color: nom.nomina.diasFalta > 0 ? "var(--red-400)" : "inherit" }}>
                          {nom.nomina.diasFalta} d
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>{nom.nomina.totalHorasExtra} hrs</td>
                      <td>${nom.nomina.sueldoBase?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td>${nom.nomina.pagoHorasExtra?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: "var(--red-400)" }}>
                        -${nom.nomina.deducciones?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: "var(--blue-400)", fontWeight: "bold" }}>
                        ${nom.nomina.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openReceipt(nom)}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recibo de Nómina Modal */}
      {modalOpen && selectedNomina && (
        <div className="modal-overlay">
          <div className="modal" id="print-receipt" style={{ maxWidth: 550, background: "var(--bg-secondary)" }}>
            <div className="section-header mb-4 no-print">
              <h2 className="section-title">Vista del Recibo</h2>
              <button
                className="btn btn-ghost btn-sm"
                style={{ border: "none", background: "none", fontSize: 20 }}
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="payroll-card">
              <div className="payroll-header">
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase" }}>
                    Recibo de Nómina Semanal
                  </h3>
                  <p className="text-xs text-secondary" style={{ marginTop: 2 }}>
                    Sistema de Asistencia
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-blue">NÓMINA</span>
                </div>
              </div>

              {/* General details */}
              <div className="mb-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p className="text-xs text-muted">EMPLEADO</p>
                  <p className="text-sm font-semibold">{selectedNomina.empleado.nombre}</p>
                  <p className="text-xs text-secondary">{selectedNomina.empleado.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">PERÍODO</p>
                  <p className="text-sm font-semibold">Semana del cálculo</p>
                  <p className="text-xs text-secondary">
                    {semana.inicio} al {semana.fin}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">SUELDO DIARIO</p>
                  <p className="text-sm font-semibold">
                    ${selectedNomina.empleado.sueldo_diario?.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">HORARIO OFICIAL</p>
                  <p className="text-sm font-semibold">
                    {selectedNomina.empleado.horario_entrada?.slice(0, 5)} - {selectedNomina.empleado.horario_salida?.slice(0, 5)}
                  </p>
                </div>
              </div>

              <div style={{ margin: "16px 0", borderBottom: "1px solid var(--border-subtle)" }} />

              {/* breakdown */}
              <div className="mb-4">
                <p className="text-xs text-muted mb-2">DESGLOSE DE CONCEPTOS</p>
                
                {/* worked days */}
                <div className="payroll-row">
                  <span>Días Trabajados ({selectedNomina.nomina.diasTrabajados} días)</span>
                  <span className="payroll-amount">
                    ${selectedNomina.nomina.sueldoBase?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* approved free days */}
                {selectedNomina.nomina.diasLibresAprobados > 0 && (
                  <div className="payroll-row">
                    <span>Días Libres Aprobados (Justificados: {selectedNomina.nomina.diasLibresAprobados})</span>
                    <span className="payroll-amount" style={{ color: "var(--green-400)" }}>
                      Pago Incluido
                    </span>
                  </div>
                )}

                {/* extra hours */}
                <div className="payroll-row">
                  <div>
                    <span>Horas Extra ({selectedNomina.nomina.totalHorasExtra} hrs)</span>
                    <div className="text-xs text-muted">
                      Tarifa: ${selectedNomina.nomina.tarifaHoraExtra?.toFixed(2)}/hr
                    </div>
                  </div>
                  <span className="payroll-amount payroll-amount-green">
                    +${selectedNomina.nomina.pagoHorasExtra?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* deductions */}
                <div className="payroll-row">
                  <div>
                    <span>Faltas Sin Justificar ({selectedNomina.nomina.diasFalta} días)</span>
                    <div className="text-xs text-muted">Descuento de sueldo diario</div>
                  </div>
                  <span className="payroll-amount payroll-amount-red">
                    -${selectedNomina.nomina.deducciones?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* final pay */}
                <div className="payroll-row total">
                  <span>PAGO NETO A RECIBIR</span>
                  <span className="payroll-amount-total">
                    ${selectedNomina.nomina.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>
              </div>

              {/* signatures (print only) */}
              <div
                className="only-print"
                style={{
                  marginTop: 60,
                  gridTemplateColumns: "1fr 1fr",
                  gap: 40,
                  textAlign: "center",
                }}
              >
                <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
                  <p className="text-xs">Firma del Empleado</p>
                </div>
                <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
                  <p className="text-xs">Firma del Administrador</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }} className="no-print">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Imprimir / Exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
