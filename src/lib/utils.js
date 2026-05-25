/**
 * Calcula la distancia en metros entre dos coordenadas GPS (Haversine)
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
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

/**
 * Redondea minutos al múltiplo de 0.5 horas más cercano
 * Ej: 20 min -> 0.5 hr, 40 min -> 1 hr, 50 min -> 1 hr, 70 min -> 1.5 hr
 */
export function redondearHoras(minutos) {
  return Math.round((minutos / 60) * 2) / 2;
}

/**
 * Calcula horas extra (fracción de 0.5) comparando hora de salida con horario definido
 */
export function calcularHorasExtra(horaSalida, horarioSalidaDefinido) {
  if (!horaSalida || !horarioSalidaDefinido) return 0;
  const [sh, sm] = horaSalida.split(":").map(Number);
  const [dh, dm] = horarioSalidaDefinido.split(":").map(Number);
  const salidaMin = sh * 60 + sm;
  const definidaMin = dh * 60 + dm;
  const extraMin = salidaMin - definidaMin;
  if (extraMin <= 0) return 0;
  return redondearHoras(extraMin);
}

/**
 * Calcula horas trabajadas dado hora_entrada y hora_salida (strings "HH:mm")
 */
export function calcularHorasTrabajadas(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;
  const [eh, em] = horaEntrada.split(":").map(Number);
  const [sh, sm] = horaSalida.split(":").map(Number);
  const entraMin = eh * 60 + em;
  const saleMin = sh * 60 + sm;
  const diff = saleMin - entraMin;
  if (diff <= 0) return 0;
  return Math.round((diff / 60) * 100) / 100;
}

/**
 * Determina si una hora de entrada es "tarde" respecto al horario oficial
 */
export function esTarde(horaEntrada, horarioEntradaOficial, toleranciaMin = 5) {
  if (!horaEntrada || !horarioEntradaOficial) return false;
  const [eh, em] = horaEntrada.split(":").map(Number);
  const [oh, om] = horarioEntradaOficial.split(":").map(Number);
  const entraMin = eh * 60 + em;
  const oficialMin = oh * 60 + om;
  return entraMin > oficialMin + toleranciaMin;
}

/**
 * Obtiene fecha actual en formato YYYY-MM-DD en zona horaria local
 */
export function fechaHoy() {
  const now = new Date();
  return now.toLocaleDateString("sv"); // 'sv' da formato YYYY-MM-DD
}

/**
 * Obtiene hora actual en formato HH:mm
 */
export function horaActual() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Calcula nómina semanal para un empleado
 */
export function calcularNomina(empleado, asistencias, solicitudesAprobadas, config) {
  const { sueldo_diario, horario_salida } = empleado;
  const horasJornada = calcularHorasTrabajadas(
    empleado.horario_entrada,
    empleado.horario_salida
  );
  const tarifaHoraExtra =
    horasJornada > 0
      ? (sueldo_diario / horasJornada) * (config?.tarifa_hora_extra || 1.5)
      : 0;

  let diasTrabajados = 0;
  let diasFalta = 0;
  let totalHorasExtra = 0;

  // Días laborables de la semana (lun-vie = 5)
  const diasSemana = 6; // lun a sab

  asistencias.forEach((a) => {
    if (a.estado === "A tiempo" || a.estado === "Tarde") {
      diasTrabajados++;
      const extra = calcularHorasExtra(a.hora_salida, horario_salida);
      totalHorasExtra += extra;
    }
  });

  // Días falta = días laborables - días trabajados - días libres aprobados
  const diasLibresAprobados = solicitudesAprobadas.length;
  diasFalta = Math.max(
    0,
    diasSemana - diasTrabajados - diasLibresAprobados
  );

  const sueldoBase = diasTrabajados * sueldo_diario;
  const pagoHorasExtra = totalHorasExtra * tarifaHoraExtra;
  const deducciones = diasFalta * sueldo_diario;
  const total = sueldoBase + pagoHorasExtra - deducciones;

  return {
    diasTrabajados,
    diasFalta,
    diasLibresAprobados,
    totalHorasExtra,
    sueldoBase,
    pagoHorasExtra,
    deducciones,
    total: Math.max(0, total),
    tarifaHoraExtra,
  };
}
