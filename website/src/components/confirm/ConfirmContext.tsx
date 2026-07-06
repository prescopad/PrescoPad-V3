import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import '../modal.css';
import './confirm.css';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="modal-backdrop" onClick={() => close(false)}>
          <div className="modal-panel confirm-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{pending.title}</span>
              <button type="button" className="modal-close" onClick={() => close(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">{pending.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => close(false)}>
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={pending.danger ? 'danger-btn' : 'primary-btn'}
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
