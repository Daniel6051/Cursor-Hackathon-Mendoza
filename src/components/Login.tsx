import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Eye, EyeSlash, House, Plant, ShieldCheck } from '@phosphor-icons/react'

export const cuentas = {
  admin: { rol: 'Administrador', clave: 'GoteaAdmin123' },
  finca: { rol: 'Propietario de finca', clave: 'GoteaFinca123' },
  hogar: { rol: 'Consumo del hogar', clave: 'GoteaHogar123' },
} as const

export type Usuario = keyof typeof cuentas
const claveSesion = 'gotea-sesion'
const perfiles = [
  { usuario: 'hogar', icono: House, nombre: 'Hogar', detalle: 'Consumo y facturas' },
  { usuario: 'finca', icono: Plant, nombre: 'Finca', detalle: 'Riego y cultivos' },
  { usuario: 'admin', icono: ShieldCheck, nombre: 'Admin', detalle: 'Todas las secciones' },
] as const

export function cargarSesion(): Usuario | null {
  try {
    const usuario = sessionStorage.getItem(claveSesion)
    return usuario && Object.hasOwn(cuentas, usuario) ? usuario as Usuario : null
  } catch {
    return null
  }
}

export function guardarSesion(usuario: Usuario | null) {
  try {
    if (usuario) sessionStorage.setItem(claveSesion, usuario)
    else sessionStorage.removeItem(claveSesion)
  } catch {
    // La sesión en memoria sigue disponible.
  }
}

export default function Login({ ingresar, selectorTema }: { ingresar: (usuario: Usuario) => void; selectorTema: ReactNode }) {
  const [nombre, setNombre] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const [mostrarClave, setMostrarClave] = useState(false)
  const [seleccionado, setSeleccionado] = useState<Usuario | null>(null)

  function elegir(usuario: Usuario) {
    setNombre(usuario)
    setClave(cuentas[usuario].clave)
    setSeleccionado(usuario)
    setMostrarClave(false)
    setError(false)
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const usuario = nombre.trim().toLowerCase() as Usuario
    if (Object.hasOwn(cuentas, usuario) && cuentas[usuario].clave === clave) ingresar(usuario)
    else setError(true)
  }

  return (
    <main className="login-screen">
      <section className="surface section-pad login-card screen">
        <div className="login-card-top">
          <img src="/logo-principal.png" className="login-logo" alt="" />
          {selectorTema}
        </div>
        <h1>Gotea</h1>
        <p className="muted">Elegí un perfil de prueba y tocá <strong>Ingresar</strong>.</p>
        <div className="login-profiles" role="group" aria-label="Perfiles de demostración">
          {perfiles.map(({ usuario, icono: Icono, nombre, detalle }) => (
            <button key={usuario} type="button" className="login-profile" onClick={() => elegir(usuario)}
              aria-pressed={seleccionado === usuario}>
              <Icono size={23} aria-hidden="true" />
              <strong>{nombre}</strong>
              <span>{detalle}</span>
            </button>
          ))}
        </div>
        <form className="mt-5 grid gap-4" onSubmit={enviar}>
          <label className="text-sm font-semibold">Usuario
            <input className="field mt-1" autoComplete="username" autoCapitalize="none" required value={nombre} onChange={e => { setNombre(e.target.value); setSeleccionado(null); setError(false) }} />
          </label>
          <div className="login-password">
            <label className="text-sm font-semibold" htmlFor="login-clave">Contraseña</label>
            <input id="login-clave" className="field mt-1" type={mostrarClave ? 'text' : 'password'} autoComplete="current-password" required value={clave} onChange={e => { setClave(e.target.value); setSeleccionado(null); setError(false) }} />
            <button type="button" className="icon-button" aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setMostrarClave(valor => !valor)}>
              {mostrarClave ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {error && <p role="alert" className="feedback error">Usuario o contraseña incorrectos.</p>}
          <button type="submit" className="button button-primary login-submit">
            <span>Ingresar</span><ArrowRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  )
}
