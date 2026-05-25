"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos"); // todos, presentes, tardes, sin_registro
  const [pendientes, setPendientes] = useState([]);
  const [adminActiveTab, setAdminActiveTab] = useState("personal"); // personal, accesos

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  // Form states
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sueldoDiario, setSueldoDiario] = useState("");
  const [horarioEntrada, setHorarioEntrada] = useState("09:00");
  const [horarioSalida, setHorarioSalida] = useState("18:00");
  const [activo, setActivo] = useState(true);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch data
  async function fetchData() {
    try {
      const [resEmp, resSol] = await Promise.all([
        fetch("/api/admin/empleados"),
        fetch("/api/solicitudes"),
      ]);

      if (!resEmp.ok || !resSol.ok) {
        throw new Error("Error al obtener datos");
      }

      const dataEmp = await resEmp.json();
      const dataSol = await resSol.json();

      setEmpleados(dataEmp.empleados || []);
      setPendientes(dataEmp.pendientes || []);
      setSolicitudes(dataSol.solicitudes || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la información del panel.");
      setLoading(false);
    }
  }

  async function handleRejectAccess(id) {
    if (!confirm("¿Estás seguro de que deseas rechazar y eliminar esta solicitud de acceso?")) return;
    try {
      const res = await fetch(`/api/admin/usuarios?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Error al rechazar la solicitud");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Open modal for add
  function openAddModal() {
    setIsEditing(false);
    setSelectedId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setSueldoDiario("300"); // default value
    setHorarioEntrada("09:00");
    setHorarioSalida("18:00");
    setActivo(true);
    setFormError("");
    setFormSuccess("");
    setModalOpen(true);
  }

  // Open modal for edit
  function openEditModal(emp) {
    setIsEditing(true);
    setSelectedId(emp.id);
    setNombre(emp.nombre);
    setEmail(emp.email);
    setPassword(""); // password not editable directly in patch
    setSueldoDiario(emp.sueldo_diario?.toString() || "");
    // Horario is from backend but we need it. Let's find it from the list or fetch if needed.
    // Wait, GET /api/admin/empleados does not return horario_entrada and horario_salida in general view, 
    // but wait! Let's check GET /api/admin/empleados code:
    // It returns: id, nombre, email, sueldo_diario, estadoHoy, horaEntrada, horaSalida, asistenciasSemana.
    // Let's verify if we can fetch it, or if we can get it from payroll view or add it.
    // Wait! Let's check if the GET /api/admin/empleados route returns horario_entrada. 
    // Looking at the route code we read earlier:
    // It selects: "SELECT * FROM usuarios WHERE rol = 'empleado' AND activo = 1 ORDER BY nombre"
    // But in the mapping for general view:
    // return { id: emp.id, nombre: emp.nombre, email: emp.email, sueldo_diario: emp.sueldo_diario, estadoHoy, horaEntrada, horaSalida, asistenciasSemana }
    // Ah, it does NOT return horario_entrada and horario_salida in general view, but wait, we can edit the GET /api/admin/empleados route 
    // to include horario_entrada and horario_salida! Or we can default them. 
    // Wait, let's look at `api/admin/empleados/route.js`. Yes, it returns:
    // { id, nombre, email, sueldo_diario, estadoHoy, horaEntrada, horaSalida, asistenciasSemana }
    // Let's check if we should modify the GET route or if we can just request the employee's detail.
    // Actually, editing `api/admin/empleados/route.js` to return `horario_entrada` and `horario_salida` in general view is extremely easy and clean!
    // But wait, the guidelines say: "API endpoints for admin: GET /api/admin/empleados - get all employees with today's status {empleados: [{id, nombre, email, sueldo_diario, estadoHoy, horaEntrada, horaSalida, asistenciasSemana}]}"
    // Wait, let's look at the actual code in `api/admin/empleados/route.js` lines 93-101. We can add `horario_entrada: emp.horario_entrada` and `horario_salida: emp.horario_salida` to the returned list. That is perfectly compatible and makes it available to the edit modal! Let's do that right after.
    // For now, let's read the values if they are present.
    setHorarioEntrada(emp.horario_entrada || "09:00");
    setHorarioSalida(emp.horario_salida || "18:00");
    setActivo(emp.activo !== 0); // Active defaults to true.
    setFormError("");
    setFormSuccess("");
    setModalOpen(true);
  }

  // Handle Form Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    const payload = {
      nombre,
      sueldo_diario: parseFloat(sueldoDiario),
      horario_entrada: horarioEntrada,
      horario_salida: horarioSalida,
    };

    try {
      let res;
      if (isEditing) {
        payload.id = selectedId;
        payload.activo = activo ? 1 : 0;
        res = await fetch("/api/admin/usuarios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.email = email;
        payload.password = password;
        res = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Ocurrió un error al procesar la solicitud");
        setFormLoading(false);
        return;
      }

      setFormSuccess(isEditing ? "Empleado actualizado con éxito" : "Empleado agregado con éxito");
      setFormLoading(false);
      
      // Refresh list
      fetchData();

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

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  // Calculate Stats
  const presentesHoy = empleados.filter(
    (e) => e.estadoHoy?.includes("A tiempo") || e.estadoHoy?.includes("Tarde")
  ).length;
  const tardesHoy = empleados.filter((e) => e.estadoHoy?.includes("Tarde")).length;
  const sinRegistroHoy = empleados.filter((e) => e.estadoHoy === "No registrado").length;
  const solicitudesPendientes = solicitudes.filter((s) => s.estado === "pendiente").length;

  const filteredEmpleados = empleados.filter((emp) => {
    if (activeFilter === "todos") return true;
    if (activeFilter === "presentes") {
      return emp.estadoHoy?.includes("A tiempo") || emp.estadoHoy?.includes("Tarde");
    }
    if (activeFilter === "tardes") {
      return emp.estadoHoy?.includes("Tarde");
    }
    if (activeFilter === "sin_registro") {
      return emp.estadoHoy === "No registrado";
    }
    return true;
  });

  function handleFilterClick(filter) {
    if (activeFilter === filter) {
      setActiveFilter("todos");
    } else {
      setActiveFilter(filter);
    }
  }

  return (
    <div>
      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div 
          className="stat-card" 
          style={{ 
            "--accent-color": "var(--green-500)",
            cursor: "pointer",
            transform: activeFilter === "presentes" ? "translate(2px, 2px)" : undefined,
            boxShadow: activeFilter === "presentes" ? "1px 1px 0px #000000" : "var(--shadow-sm)",
            background: activeFilter === "presentes" ? "rgba(0, 204, 122, 0.15)" : "#ffffff"
          }}
          onClick={() => handleFilterClick("presentes")}
        >
          <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--green-400)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
          </div>
          <div className="stat-value">{presentesHoy}</div>
          <div className="stat-label">Presentes Hoy</div>
        </div>

        <div 
          className="stat-card" 
          style={{ 
            "--accent-color": "var(--yellow-500)",
            cursor: "pointer",
            transform: activeFilter === "tardes" ? "translate(2px, 2px)" : undefined,
            boxShadow: activeFilter === "tardes" ? "1px 1px 0px #000000" : "var(--shadow-sm)",
            background: activeFilter === "tardes" ? "rgba(255, 179, 0, 0.15)" : "#ffffff"
          }}
          onClick={() => handleFilterClick("tardes")}
        >
          <div className="stat-icon" style={{ background: "rgba(234, 179, 8, 0.15)", color: "var(--yellow-400)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-value">{tardesHoy}</div>
          <div className="stat-label">Retardos Hoy</div>
        </div>

        <div 
          className="stat-card" 
          style={{ 
            "--accent-color": "var(--red-500)",
            cursor: "pointer",
            transform: activeFilter === "sin_registro" ? "translate(2px, 2px)" : undefined,
            boxShadow: activeFilter === "sin_registro" ? "1px 1px 0px #000000" : "var(--shadow-sm)",
            background: activeFilter === "sin_registro" ? "rgba(255, 59, 48, 0.15)" : "#ffffff"
          }}
          onClick={() => handleFilterClick("sin_registro")}
        >
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red-400)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="22" y2="12" />
              <line x1="22" y1="8" x2="18" y2="12" />
            </svg>
          </div>
          <div className="stat-value">{sinRegistroHoy}</div>
          <div className="stat-label">Sin Registro</div>
        </div>

        <div 
          className="stat-card" 
          style={{ 
            "--accent-color": "var(--purple-500)",
            cursor: "pointer"
          }}
          onClick={() => router.push("/admin/solicitudes")}
        >
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "var(--purple-400)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="stat-value">{solicitudesPendientes}</div>
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            Solicitudes Pendientes
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main List Card */}
      <div className="card">
        <div className="section-header">
          <div>
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              Personal de la Empresa
              {activeFilter === "presentes" && (
                <span className="badge badge-green" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  Filtrado: Presentes
                  <button onClick={(e) => { e.stopPropagation(); setActiveFilter("todos"); }} style={{ border: "none", background: "none", cursor: "pointer", marginLeft: 6, fontWeight: 900, fontSize: 12 }}>×</button>
                </span>
              )}
              {activeFilter === "tardes" && (
                <span className="badge badge-yellow" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  Filtrado: Retardos
                  <button onClick={(e) => { e.stopPropagation(); setActiveFilter("todos"); }} style={{ border: "none", background: "none", cursor: "pointer", marginLeft: 6, fontWeight: 900, fontSize: 12 }}>×</button>
                </span>
              )}
              {activeFilter === "sin_registro" && (
                <span className="badge badge-red" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  Filtrado: Sin Registro
                  <button onClick={(e) => { e.stopPropagation(); setActiveFilter("todos"); }} style={{ border: "none", background: "none", cursor: "pointer", marginLeft: 6, fontWeight: 900, fontSize: 12 }}>×</button>
                </span>
              )}
            </h2>
            <p className="section-subtitle">
              {activeFilter !== "todos" 
                ? "Mostrando resultados filtrados para el día de hoy" 
                : "Estado de hoy y resumen de la semana actual"}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Agregar Empleado
          </button>
        </div>

        {/* Tabs de Selección */}
        <div style={{ display: "flex", gap: 12, borderBottom: "3px solid #000000", paddingBottom: 12, marginBottom: 20 }}>
          <button
            type="button"
            className={`btn ${adminActiveTab === "personal" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setAdminActiveTab("personal")}
            style={{ fontWeight: 800 }}
          >
            👤 Personal Activo ({empleados.length})
          </button>
          <button
            type="button"
            className={`btn ${adminActiveTab === "accesos" ? "btn-primary" : "btn-ghost"} btn-sm`}
            onClick={() => setAdminActiveTab("accesos")}
            style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}
          >
            🔑 Solicitudes de Acceso
            {pendientes.length > 0 && (
              <span className="badge badge-red" style={{ fontSize: 10, padding: "2px 6px", boxShadow: "1px 1px 0px #000000" }}>
                {pendientes.length}
              </span>
            )}
          </button>
        </div>

        {adminActiveTab === "personal" ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Sueldo Diario</th>
                  <th>Horario</th>
                  <th style={{ textAlign: "center" }}>Asistencias Sem.</th>
                  <th>Estado Hoy</th>
                  <th>Hora Entrada</th>
                  <th>Hora Salida</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmpleados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center" style={{ padding: "40px 0" }}>
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <p>
                          {empleados.length === 0 
                            ? "No hay empleados registrados" 
                            : "Ningún empleado coincide con el filtro seleccionado"}
                        </p>
                        {empleados.length > 0 && (
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ marginTop: 12 }}
                            onClick={() => setActiveFilter("todos")}
                          >
                            Mostrar todos
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmpleados.map((emp) => {
                    let badgeClass = "badge-gray";
                    if (emp.activo === 0) badgeClass = "badge-gray";
                    else if (emp.estadoHoy?.startsWith("A tiempo")) badgeClass = "badge-green";
                    else if (emp.estadoHoy?.startsWith("Tarde")) badgeClass = "badge-yellow";
                    else if (emp.estadoHoy === "No registrado") badgeClass = "badge-red";

                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="table-name">
                            <div
                              className="avatar"
                              style={{
                                width: 28,
                                height: 28,
                                fontSize: 11,
                                background: "linear-gradient(135deg, var(--blue-500), var(--blue-600))",
                              }}
                            >
                              {emp.nombre.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div>{emp.nombre}</div>
                              <div className="text-xs text-muted">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>${emp.sueldo_diario?.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</td>
                        <td className="text-sm">
                          {emp.horario_entrada && emp.horario_salida
                            ? `${emp.horario_entrada.slice(0, 5)} - ${emp.horario_salida.slice(0, 5)}`
                            : "No definido"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge badge-blue">{emp.asistenciasSemana} / 6</span>
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            {emp.activo === 0 ? "Pendiente" : emp.estadoHoy}
                          </span>
                        </td>
                        <td>{emp.horaEntrada ? emp.horaEntrada.slice(0, 5) : "-"}</td>
                        <td>{emp.horaSalida ? emp.horaSalida.slice(0, 5) : "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px 8px" }}
                            onClick={() => openEditModal(emp)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VISTA DE SOLICITUDES DE ACCESO */
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Fecha de Registro</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center" style={{ padding: "40px 0" }}>
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                        <p>No hay solicitudes de acceso pendientes</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendientes.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="table-name">
                          <div
                            className="avatar"
                            style={{
                              width: 28,
                              height: 28,
                              fontSize: 11,
                              background: "linear-gradient(135deg, var(--purple-500), var(--purple-600))",
                            }}
                          >
                            {emp.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{emp.nombre}</div>
                            <div className="text-xs text-muted">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {emp.creado_en 
                          ? new Date(emp.creado_en.replace(" ", "T") + "Z").toLocaleDateString("es-MX", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : "No disponible"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 12 }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: "4px 8px" }}
                            onClick={() => handleRejectAccess(emp.id)}
                          >
                            Rechazar
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: "4px 8px" }}
                            onClick={() => openEditModal({ ...emp, sueldo_diario: 0, horario_entrada: "09:00", horario_salida: "18:00", activo: 0 })}
                          >
                            Aprobar y Configurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="section-header mb-4">
              <h2 className="section-title">
                {isEditing ? "Editar Datos de Empleado" : "Registrar Nuevo Empleado"}
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                style={{ border: "none", background: "none", fontSize: 20 }}
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="alert alert-error mb-4">{formError}</div>}
              {formSuccess && <div className="alert alert-success mb-4">{formSuccess}</div>}

              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              {!isEditing && (
                <>
                  <div className="form-group">
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="juan.perez@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contraseña Temporal</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

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

              {isEditing && (
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={(e) => setActivo(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    Empleado Activo
                  </label>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <span className="spinner" /> : null}
                  {isEditing ? "Guardar Cambios" : "Crear Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
