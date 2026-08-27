import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

// 48px de haut : confortable au pouce, et assez grand pour que iOS ne
// zoome pas au focus (il le fait sous 16px de texte).
const BASE =
  "w-full min-h-12 rounded-[var(--radius-control)] border border-hairline bg-raised px-3.5 py-3 text-[16px] font-medium text-ink outline-none transition duration-150 placeholder:text-ink-3 focus:border-accent";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
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
  return <textarea {...props} className={`${BASE} min-h-28 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${BASE} appearance-none ${props.className ?? ""}`} />;
}
