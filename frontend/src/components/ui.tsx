import { AnimatePresence, motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import type { SurveyStatus } from '../api/types'
import { cn } from '../lib/utils'

// ---------------------------------------------------------------- Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  // чёрная pill-кнопка; оранжевый — только как акцент при наведении
  primary: 'bg-graphite text-milk hover:bg-rust-500 shadow-card',
  secondary: 'bg-paper text-graphite border border-graphite/15 hover:border-graphite/40',
  outline: 'border border-graphite/20 text-graphite hover:border-graphite/50 hover:bg-graphite/[0.03]',
  ghost: 'text-stone-700 hover:text-graphite hover:bg-graphite/[0.06]',
  danger: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/25',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-12 px-7 text-base gap-2 rounded-full',
  icon: 'h-9 w-9 rounded-full justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-semibold transition-all duration-300',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rust-500/25',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

// ---------------------------------------------------------------- Inputs

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn('field', invalid && 'border-rose-500/60 focus:border-rose-600 focus:ring-rose-500/15', className)}
      {...rest}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cn('field min-h-[90px] resize-y', invalid && 'border-rose-500/60', className)}
    {...rest}
  />
))
Textarea.displayName = 'Textarea'

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 text-xs font-medium text-rose-600"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-stone-500">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-start gap-3 text-left"
    >
      <span
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300',
          checked ? 'bg-rust-500' : 'bg-graphite/15 group-hover:bg-graphite/25',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className={cn('h-5 w-5 rounded-full bg-paper shadow', checked ? 'ml-auto' : 'ml-0')}
        />
      </span>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-stone-800">{label}</span>}
          {description && <span className="block text-xs text-stone-500">{description}</span>}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------- Badges

const statusStyles: Record<SurveyStatus, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-graphite/[0.04] text-stone-700 border-graphite/15', dot: 'bg-stone-500' },
  PUBLISHED: { label: 'Активна', cls: 'bg-rust-500/10 text-rust-700 border-rust-500/25', dot: 'bg-rust-500' },
  CLOSED: { label: 'Закрыта', cls: 'bg-graphite text-milk border-graphite', dot: 'bg-chrome' },
}

export function StatusBadge({ status }: { status: SurveyStatus }) {
  const s = statusStyles[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', s.cls)}>
      <span className="relative flex h-1.5 w-1.5">
        {status === 'PUBLISHED' && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-75', s.dot)} />}
        <span className={cn('relative h-1.5 w-1.5 rounded-full', s.dot)} />
      </span>
      {s.label}
    </span>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-graphite/10 bg-graphite/[0.06] px-2.5 py-0.5 text-xs font-semibold text-stone-700',
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- Modal

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'glass-strong relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-2xl',
              widths[size],
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-graphite/5 px-6 pb-4 pt-5">
                <div>
                  {title && <h3 className="text-lg font-bold text-graphite">{title}</h3>}
                  {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-stone-600 transition hover:bg-graphite/10 hover:text-graphite">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-graphite/5 bg-black/10 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Удалить',
  danger = true,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmText?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-stone-700">{message}</div>
    </Modal>
  )
}

// ---------------------------------------------------------------- misc

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-rust-600', className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-graphite/10 border-t-graphite" />
        <div className="absolute inset-3 animate-spin rounded-full border-2 border-transparent border-b-rust-500 [animation-direction:reverse] [animation-duration:1.4s]" />
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-col items-center px-6 py-14 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-graphite text-milk"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-bold text-graphite">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-stone-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-graphite sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  )
}

/** Число, которое «докручивается» до значения при появлении на экране. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 70, damping: 20 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(
    () =>
      spring.on('change', (v) =>
        setDisplay(v.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
      ),
    [spring, decimals],
  )

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

export function StatCard({
  icon,
  label,
  value,
  suffix,
  decimals,
  hint,
  delay = 0,
}: {
  icon: ReactNode
  label: string
  value: number
  suffix?: string
  decimals?: number
  hint?: ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 22 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-graphite bg-graphite p-5 text-milk shadow-card"
    >
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full border border-milk/15 text-chrome">{icon}</span>
      </div>
      <div className="font-display text-5xl font-bold leading-none tracking-tight">
        <CountUp value={value} suffix={suffix} decimals={decimals} />
      </div>
      {hint && <div className="mt-3 text-xs text-stone-400">{hint}</div>}
    </motion.div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  layoutId,
}: {
  tabs: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  layoutId: string
}) {
  return (
    <div className="inline-flex rounded-full border border-graphite/15 bg-paper p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            value === t.value ? 'text-milk' : 'text-stone-600 hover:text-graphite',
          )}
        >
          {value === t.value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-graphite"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Молочный фон с тонкой редакционной сеткой. */
export function AnimatedBackground({ accent }: { accent?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-milk">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
          maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 75%)',
        }}
      />
      {accent && (
        <div className="absolute -right-48 -top-48 h-[30rem] w-[30rem] rounded-full opacity-[0.07] blur-3xl" style={{ background: accent }} />
      )}
    </div>
  )
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-graphite">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-milk" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
          <path d="M6 8h12M6 12h8M6 16h4" />
          <circle cx="17" cy="16" r="1.8" className="fill-rust-500" stroke="none" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-lg font-bold uppercase tracking-wide text-graphite">SmartBiz</div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-500">/ Survey</div>
        </div>
      )}
    </div>
  )
}
