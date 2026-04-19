interface Props {
  name: string
  size?: number
}

export function Avatar({ name, size = 28 }: Props) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `oklch(44% 0.14 ${hue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: 'oklch(97% 0.004 265)',
      letterSpacing: '-0.01em', userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}
