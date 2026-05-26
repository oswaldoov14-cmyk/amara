import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { revokeToken } from "@/lib/blocklist";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "sistema-asistencia-secret-2024"
);

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    // Revocar el token si existe en la cookie
    if (token) {
      try {
        const { payload } = await jwtVerify(token, SECRET);
        if (payload.jti && payload.exp) {
          await revokeToken(payload.jti, payload.exp);
        }
      } catch {
        // Ignorar errores si el token ya era inválido o estaba expirado
      }
    }

    const response = NextResponse.json({ success: true });
    
    // Eliminar la cookie de sesión del cliente expirándola
    response.cookies.set("session", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
