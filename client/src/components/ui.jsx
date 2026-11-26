import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, GraduationCap, Loader2 } from 'lucide-react';

export const Logo = ({ to = '/' }) => (
  <Link to={to} className="flex items-center gap-2 font-semibold tracking-tight">
    <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white"><GraduationCap size={18} /></span>
    ExamGen AI
  </Link>
);

export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="animate-spin" aria-label="Loading" />;

export const Button = ({ busy, children, variant = 'primary', className = '', ...props }) => (
  <button type="button" {...props} disabled={busy || props.disabled} className={`btn btn-${variant} ${className}`}>
    {busy && <Spinner />}
    {children}
  </button>
);

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
  </label>
);

export const ErrorBox = ({ message, onRetry }) =>
  message ? (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && <button className="cursor-pointer font-medium underline" onClick={onRetry}>Try again</button>}
    </div>
  ) : null;

export const Notice = ({ children }) => (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">{children}</div>
);

export const DemoNotice = () => (
  <Notice><strong>Demo mode.</strong> These are hand-written computer science sample questions. They are not AI-generated and not based on your files or chosen subject.</Notice>
);

export const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />)}
  </div>
);

export const Empty = ({ icon: Icon, title, text, children }) => (
  <div className="card flex flex-col items-center px-6 py-12 text-center">
    {Icon && <Icon className="muted mb-3" />}
    <h3 className="font-medium">{title}</h3>
    <p className="muted mt-1 max-w-sm text-sm">{text}</p>
    <div className="mt-4">{children}</div>
  </div>
);

// Native <dialog> gives focus trapping and Escape handling
export function Modal({ open, title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onClose(); }}
      className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100`}>
      {open && <><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</>}
    </dialog>
  );
}

export function Confirm({ open, title, text, confirmLabel = 'Confirm', onConfirm, onClose, busy }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="muted text-sm">{text}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={onConfirm} busy={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
