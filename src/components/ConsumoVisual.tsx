import { useEffect, useRef, useState } from 'react'

export const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
export const chartTooltip = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  fontSize: 13,
}

export function useAnimacion() {
  const [activar, setActivar] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const preferencia = matchMedia('(prefers-reduced-motion: reduce)')
    function cambiar() { setActivar(!preferencia.matches) }
    preferencia.addEventListener('change', cambiar)
    return () => preferencia.removeEventListener('change', cambiar)
  }, [])
  return activar
}

export function Contador({ valor }: { valor: number }) {
  const animar = useAnimacion()
  const [visible, setVisible] = useState(0)
  const ultimo = useRef(0)
  useEffect(() => {
    if (!animar || !Number.isFinite(valor)) {
      ultimo.current = Number.isFinite(valor) ? valor : 0
      return
    }
    let fotograma = 0
    const anterior = ultimo.current
    const inicio = performance.now()
    function avanzar(ahora: number) {
      const avance = Math.min(1, (ahora - inicio) / 360)
      ultimo.current = avance === 1 ? valor : anterior + (valor - anterior) * (1 - (1 - avance) ** 3)
      setVisible(ultimo.current)
      if (avance < 1) fotograma = requestAnimationFrame(avanzar)
    }
    fotograma = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(fotograma)
  }, [valor, animar])

  return (
    <>
      <span className="sr-only">{numero.format(valor)}</span>
      <span aria-hidden="true">{numero.format(animar && Number.isFinite(valor) ? visible : valor)}</span>
    </>
  )
}
