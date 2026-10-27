import { redirect } from "next/navigation";

/** El formulario de publicación ahora es «Publicar» (modo vendedor). */
export default function NuevoLote() {
  redirect("/publicar");
}
