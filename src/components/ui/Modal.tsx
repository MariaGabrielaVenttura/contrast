import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { cx } from './cx';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  /** Where focus goes on close when the trigger no longer exists. */
  returnFocus?: () => void;
  size?: 'md' | 'lg';
}

export function Modal({ open, onOpenChange, title, description, eyebrow, children, footer, initialFocus, returnFocus, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] print:hidden" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            if (initialFocus?.current) {
              e.preventDefault();
              initialFocus.current.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            if (returnFocus) {
              e.preventDefault();
              returnFocus();
            }
          }}
          className={cx(
            'fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8 print:hidden',
            size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
          )}
        >
          {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">{eyebrow}</p>}
          <Dialog.Title className="pr-8 text-xl font-semibold tracking-tight text-slate-900">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-3 text-slate-600">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">Dialog</Dialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
