'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized: ConfirmOptions = typeof opts === 'string' ? { description: opts } : opts;
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handle = (result: boolean) => {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {options && (
        <div
          className="animate-fade fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={() => handle(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-rise w-full max-w-sm rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-6 shadow-2xl"
          >
            <div
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: options.danger ? 'var(--color-danger-soft)' : 'var(--color-brand-soft)',
                color: options.danger ? 'var(--color-danger)' : 'var(--color-brand)',
              }}
            >
              {options.danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </div>

            {options.title && (
              <h3 className="mb-1 font-display text-lg font-semibold text-[color:var(--color-ink)]">
                {options.title}
              </h3>
            )}
            <p className="whitespace-pre-line text-sm text-[color:var(--color-ink-soft)]">
              {options.description}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => handle(false)} className="btn btn-ghost px-4 py-2 text-sm">
                {options.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => handle(true)}
                className={`btn px-4 py-2 text-sm ${options.danger ? 'btn-danger' : 'btn-accent'}`}
              >
                {options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
