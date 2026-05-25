import "./globals.css";

export const metadata = {
  title: "Sistema de Asistencia | Control de Personal",
  description:
    "Sistema de control de asistencia de personal con geolocalización, gestión de solicitudes y cálculo de nómina.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div className="bg-gradient-mesh" />
        {children}
      </body>
    </html>
  );
}
