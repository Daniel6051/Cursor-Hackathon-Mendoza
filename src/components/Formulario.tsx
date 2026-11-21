import { useState, type FormEvent } from 'react'
import { Drop } from '@phosphor-icons/react'
import type { Habitos } from '../types'

export const habitosIniciales: Habitos = {
  personas: 3,
  duchaMin: 10,
  duchasPorDia: 1,
  duchaAhorradora: false,
  descargasPorPersona: 5,
  inodoroDobleDescarga: false,
  lavarropasPorSemana: 3,
  platosPorDia: 2,
  riegoMinPorSemana: 60,
  autoLavadosPorMes: 2,
  canillasQueGotean: 0,
}

type Campo = keyof Habitos
type Borrador = Record<Campo, string | boolean>

const grupos: { titulo: string; campos: [Campo, string][] }[] = [
  { titulo: 'Tu casa', campos: [['personas', 'Personas que viven en casa']] },
  {
    titulo: 'Baño',
    campos: [
      ['duchaMin', 'Minutos por ducha'],
      ['duchasPorDia', 'Duchas por persona por día'],
      ['descargasPorPersona', 'Descargas por persona por día'],
      ['duchaAhorradora', 'Tengo una ducha ahorradora'],
      ['inodoroDobleDescarga', 'Tengo un inodoro de doble descarga'],
    ],
  },
  {
    titulo: 'Cocina y ropa',
    campos: [
      ['platosPorDia', 'Lavadas de platos por día'],
      ['lavarropasPorSemana', 'Lavados de ropa por semana'],
    ],
  },
  {
    titulo: 'Afuera',
    campos: [
      ['riegoMinPorSemana', 'Minutos de riego por semana'],
      ['autoLavadosPorMes', 'Lavados de auto por mes'],
    ],
  },
  { titulo: 'Pérdidas', campos: [['canillasQueGotean', 'Canillas que gotean']] },
]

type Props = { habitos: Habitos; onSubmit: (habitos: Habitos) => void }

export default function Formulario({ habitos, onSubmit }: Props) {
  const [borrador, setBorrador] = useState<Borrador>(() =>
    Object.fromEntries(
      Object.entries(habitos).map(([campo, valor]) =>
        [campo, typeof valor === 'boolean' ? valor : String(valor)],
      ),
    ) as Borrador,
  )
  const [error, setError] = useState('')

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valores = Object.fromEntries(
      Object.entries(borrador).map(([campo, valor]) =>
        [campo, typeof valor === 'boolean' ? valor : Number(valor)],
      ),
    ) as Habitos

    if (
      valores.personas < 1 ||
      Object.values(valores).some(valor => typeof valor === 'number' &&
        (!Number.isFinite(valor) || valor < 0)) ||
      Object.values(borrador).includes('')
    ) {
      setError('Completá los campos con valores de cero o más y cargá al menos una persona.')
      return
    }

    setError('')
    onSubmit(valores)
  }

  return (
    <form noValidate onSubmit={enviar} className="space-y-6">
      {grupos.map(({ titulo, campos }) => (
        <fieldset key={titulo} className="min-w-0">
          <legend className="mb-3 text-xl font-bold">{titulo}</legend>
          <div className="surface section-pad grid items-end gap-4 sm:grid-cols-2">
            {campos.map(([campo, etiqueta]) => {
              const valor = borrador[campo]
              return typeof valor === 'boolean' ? (
                <label key={campo} className="flex min-h-11 items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={valor}
                    onChange={event => setBorrador({ ...borrador, [campo]: event.target.checked })}
                    className="h-5 w-5 shrink-0"
                  />
                  {etiqueta}
                </label>
              ) : (
                <label key={campo} className="flex flex-col gap-2 text-sm font-medium">
                  {etiqueta}
                  <input
                    type="number"
                    inputMode="decimal"
                    min={campo === 'personas' ? 1 : 0}
                    step="any"
                    required
                    value={valor}
                    onChange={event => setBorrador({ ...borrador, [campo]: event.target.value })}
                    className="field text-base"
                  />
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
      {error && <p role="alert" className="feedback error">{error}</p>}
      <button type="submit" className="button button-primary">
        <Drop size={17} /> Calcular mi consumo
      </button>
    </form>
  )
}
