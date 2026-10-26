import Link from "next/link";

/**
 * Isotipo «Trueque»: una S hecha de dos arcos que se pasan el material —las puntas llevan el color del otro lado—.
 * Navy = confianza, verde = acción. Sobre fondo oscuro, `invertido` usa blanco y verde claro (pri-200).
 */
export function Isotipo({ size = 36, invertido = false, className = "" }: { size?: number; invertido?: boolean; className?: string }) {
  const a = invertido ? "#FFFFFF" : "#1F3A64"; // nav-700
  const b = invertido ? "#9ED3C6" : "#0B6B57"; // pri-200 / pri-600
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <path d="M32.66 11A10 8 0 1 0 24 23" fill="none" stroke={a} strokeWidth="8" />
      <path d="M24 23A10 8 0 1 1 15.34 35" fill="none" stroke={b} strokeWidth="8" />
      <circle cx="32.66" cy="11" r="5.2" fill={b} />
      <circle cx="15.34" cy="35" r="5.2" fill={a} />
    </svg>
  );
}

export function Logo({ claro = false, tamano = 32, enlace = true }: { claro?: boolean; tamano?: number; enlace?: boolean }) {
  const contenido = (
    <>
      <Isotipo size={tamano} invertido={claro} />
      <span className={`text-xl font-bold tracking-tight ${claro ? "text-white" : "text-nav-900"}`}>Swapit</span>
    </>
  );
  return enlace ? (
    <Link href="/" className="flex items-center gap-2" aria-label="Swapit, inicio">
      {contenido}
    </Link>
  ) : (
    <span className="flex items-center gap-2">{contenido}</span>
  );
}
