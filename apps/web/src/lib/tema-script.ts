/** Script en línea para <head>: aplica el tema guardado (o el del sistema) antes del primer pintado. Sin "use client": lo usa el layout del servidor. */
export const SCRIPT_TEMA =
  'try{var t=localStorage.getItem("swapit-tema");if(t==="oscuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}';
