// Verificación manual de empresas desde tu máquina (mientras no haya un proveedor de SUNAT configurado).
//   Listar las pendientes:
//     ADMIN_EMAIL=… ADMIN_PASSWORD=… API_URL=https://swapit-api.vercel.app WEB_ORIGIN=https://app.tudominio.pe node scripts/admin-verificar.mjs
//   Verificar o rechazar una:
//     … node scripts/admin-verificar.mjs <idEmpresa> VERIFICADA "Ficha RUC: activo y habido; representante confirmado por teléfono"
//     … node scripts/admin-verificar.mjs <idEmpresa> RECHAZADA "Motivo"
// La contraseña solo se lee del entorno; no se imprime. Antes de VERIFICAR, comprueba el RUC en la consulta oficial de SUNAT
// (https://e-consultaruc.sunat.gob.pe) y confirma la identidad del representante por un canal independiente.
const { ADMIN_EMAIL, ADMIN_PASSWORD, API_URL, WEB_ORIGIN } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !API_URL || !WEB_ORIGIN) {
  console.error('Define ADMIN_EMAIL, ADMIN_PASSWORD, API_URL y WEB_ORIGIN (ver el encabezado de este archivo).');
  process.exit(1);
}
const [id, estado, ...nota] = process.argv.slice(2);
const base = API_URL.replace(/\/+$/, '');
let cookie = '';

async function pedir(metodo, ruta, cuerpo) {
  const res = await fetch(`${base}/api${ruta}`, {
    method: metodo,
    // Origin = la web: la API rechaza escrituras con otro origen (defensa CSRF).
    headers: { Origin: WEB_ORIGIN, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.match(/swapit_token=[^;]+/)?.[0] ?? cookie;
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const sesion = await pedir('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
if (sesion.status !== 200 || sesion.data.rol !== 'ADMIN') {
  console.error(`No se pudo iniciar sesión como administrador (HTTP ${sesion.status}).`);
  process.exit(1);
}

if (!id) {
  const r = await pedir('GET', '/admin/empresas');
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
  if (!r.data.length) console.log('No hay empresas pendientes.');
  for (const e of r.data) {
    console.log(`${e.id}  RUC ${e.ruc}  ${e.razonSocial}  | rep. ${e.representanteLegal ?? '-'} | contacto ${e.contactoNombre ?? '-'} ${e.telefono ?? ''} | registrada ${String(e.createdAt).slice(0, 10)}`);
  }
} else {
  if (!['VERIFICADA', 'RECHAZADA', 'PENDIENTE'].includes(estado)) {
    console.error('El segundo argumento debe ser VERIFICADA, RECHAZADA o PENDIENTE.');
    process.exit(1);
  }
  const r = await pedir('PATCH', `/admin/empresas/${id}/verificacion`, { estado, nota: nota.join(' ') || undefined });
  if (r.status !== 200) {
    console.error(`No se pudo actualizar (HTTP ${r.status}): ${JSON.stringify(r.data)}`);
    process.exit(1);
  }
  console.log(`${r.data.razonSocial}: ${r.data.estadoKyb} (método ${r.data.metodoVerificacion}).`);
}
