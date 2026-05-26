/**
 * Esquemas de validación Zod — uno por endpoint
 *
 * USO EN API ROUTE:
 *   import { loginSchema } from '@/lib/validation'
 *
 *   const body = await req.json()
 *   const parsed = loginSchema.safeParse(body)
 *   if (!parsed.success) {
 *     return Response.json({ error: parsed.error.flatten() }, { status: 422 })
 *   }
 *   const { email, password } = parsed.data
 */

import { z } from 'zod'

// ─── Autenticación ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Email inválido')
    .max(254)
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'Mínimo 6 caracteres')
    .max(128),
})

// ─── Asistencias ─────────────────────────────────────────────────────────────

const coordenadaLat = z.number().min(-90).max(90)
const coordenadaLng = z.number().min(-180).max(180)

export const registrarEntradaSchema = z.object({
  tipo: z.literal('entrada'),
  lat: coordenadaLat,
  lng: coordenadaLng,
  aclaracion: z.string().max(500).optional(),
})

export const registrarSalidaSchema = z.object({
  tipo: z.literal('salida'),
  lat: coordenadaLat,
  lng: coordenadaLng,
})

export const asistenciaSchema = z.discriminatedUnion('tipo', [
  registrarEntradaSchema,
  registrarSalidaSchema,
])

// ─── Usuarios (admin) ─────────────────────────────────────────────────────────

export const crearUsuarioSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2)
    .max(100)
    .trim(),
  email: z.string().email('Email inválido').max(254).toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres para contraseñas de empleados')
    .max(128),
  sueldo_diario: z.number().min(0).max(99999),
  horario_entrada: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  horario_salida: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato HH:mm requerido'),
  rol: z.enum(['empleado', 'admin']).default('empleado'),
})

export const actualizarUsuarioSchema = z.object({
  id: z.number().int().positive(),
  nombre: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().max(254).toLowerCase().trim().optional(),
  sueldo_diario: z.number().min(0).max(99999).optional(),
  horario_entrada: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  horario_salida: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  activo: z.union([z.literal(0), z.literal(1)]).optional(),
})

// ─── Solicitudes ──────────────────────────────────────────────────────────────

export const crearSolicitudSchema = z.object({
  tipo: z.enum(['vacaciones', 'descanso', 'permiso_goce', 'permiso_sin_goce']),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  motivo: z.string().max(500).optional(),
})

export const responderSolicitudSchema = z.object({
  id: z.number().int().positive(),
  estado: z.enum(['aprobada', 'rechazada']),
  respuesta_admin: z.string().max(500).optional(),
})

// ─── Configuración ────────────────────────────────────────────────────────────

export const configuracionSchema = z.object({
  lat_trabajo: coordenadaLat,
  lng_trabajo: coordenadaLng,
  radio_metros: z.number().int().min(10).max(5000),
  horario_entrada: z.string().regex(/^\d{2}:\d{2}$/),
  horario_salida: z.string().regex(/^\d{2}:\d{2}$/),
  tarifa_hora_extra: z.number().min(1).max(3),
})

// ─── Helper para respuesta de error uniforme ──────────────────────────────────

/**
 * Valida un body con un schema y retorna la respuesta de error lista para usar.
 * @param {z.ZodSchema} schema
 * @param {unknown} body
 * @returns {{ ok: true, data: any } | { ok: false, response: Response }}
 */
export function validate(schema, body) {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'Datos inválidos',
          detalles: result.error.flatten().fieldErrors,
        },
        { status: 422 }
      ),
    }
  }
  return { ok: true, data: result.data }
}
