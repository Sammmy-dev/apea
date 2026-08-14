'use client';

import type { InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Persistent-label input per DESIGN.md §Input Fields: rectangular, 1px gray
 * border, 2px navy border on focus, 48px touch target. Labels never float.
 */
export default function AuthInput({ label, id, ...rest }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-sm text-on-surface-variant uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        className="h-12 w-full rounded border border-border bg-white px-3 text-body-md text-on-surface placeholder:text-outline focus:border-2 focus:border-primary focus:outline-none"
        {...rest}
      />
    </div>
  );
}