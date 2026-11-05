export function DetailDrawerActions({ children, className = '', style, ...props }) {
  if (!children) return null
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, ...style }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}
