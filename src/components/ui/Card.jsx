// src/components/ui/Card.jsx
// Reusable Compound Card Component following React Composition Patterns

export default function Card({ children, className = '', style, onClick, ...props }) {
  return (
    <div
      className={`card overflow-hidden ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className = '', style, action, ...props }) {
  return (
    <div className={`card-header flex items-center justify-between ${className}`} style={style} {...props}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
      </div>
      {action && <div className="card-action flex-shrink-0">{action}</div>}
    </div>
  )
}

Card.Title = function CardTitle({ children, className = '', icon: Icon, style, ...props }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={style} {...props}>
      {Icon && <Icon size={15} style={{ color: 'var(--text-500)' }} className="flex-shrink-0" />}
      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-900)' }}>
        {children}
      </span>
    </div>
  )
}

Card.Body = function CardBody({ children, className = '', style, ...props }) {
  return (
    <div className={`card-body ${className}`} style={style} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className = '', style, ...props }) {
  return (
    <div
      className={`card-footer p-3 border-t border-slate-100 dark:border-slate-800 ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}
