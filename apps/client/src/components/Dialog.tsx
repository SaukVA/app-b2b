import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones del pie (p. ej. Cancelar y la acción principal). */
  actions: ReactNode;
  /** Escape o un clic en el fondo. Quien lo monta decide desmontarlo. */
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(container: HTMLElement | null): HTMLElement[] {
  return container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

/** Foco inicial en el primer control y, al desmontar, de vuelta a quien abrió el diálogo. */
function useDialogFocus(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    (focusables(ref.current)[0] ?? ref.current)?.focus();
    return () => trigger?.focus();
  }, [ref]);
}

/** Tab y Mayús+Tab no salen del diálogo. */
function trapTab(event: KeyboardEvent<HTMLDivElement>, container: HTMLElement | null) {
  const items = focusables(container);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const edge = event.shiftKey ? first : last;
  if (document.activeElement !== edge) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}

export function Dialog({ title, description, children, actions, onClose }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogFocus(ref);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'Tab') trapTab(event, ref.current);
  };
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={styles.dialog}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}
        {children}
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  );
}
