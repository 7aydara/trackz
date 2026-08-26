import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const BASE =
  "w-full rounded-2xl border border-hair bg-white px-3.5 py-2.5 text-base font-semibold outline-none transition placeholder:font-medium placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent-soft";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <Label>{label}</Label>}
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${BASE} min-h-24 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE} appearance-none ${props.className ?? ""}`} />;
}
