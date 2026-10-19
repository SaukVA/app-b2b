import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import styles from './Menu.module.css';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  /** `danger` para acciones destructivas (p. ej. «Bloquear»). */
  tone?: 'default' | 'danger';
}

export interface MenuProps {
  /** Nombre accesible del disparador (p. ej. «Opciones de Ana»). */
  label: string;
  items: readonly MenuItem[];
  icon?: ReactNode;
}

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

/** Un clic fuera del menú lo cierra. */
function useCloseOnOutsideClick(open: boolean, root: HTMLElement | null, close: () => void) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!root?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, root, close]);
}

function moveFocus(list: HTMLElement | null, step: number) {
  const items = Array.from(list?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const current = items.indexOf(document.activeElement as HTMLElement);
  items[(current + step + items.length) % items.length]?.focus();
}

function useMenu() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);
  return { open, setOpen, close, triggerRef, listRef };
}

/** Menú de acciones accesible: disparador IconButton, flechas, Escape y clic fuera. */
export function Menu({ label, items, icon = <DotsIcon /> }: MenuProps) {
  const menuId = useId();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const { open, setOpen, close, triggerRef, listRef } = useMenu();
  useCloseOnOutsideClick(open, root, () => setOpen(false));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(listRef.current, event.key === 'ArrowDown' ? 1 : -1);
    }
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') setOpen(false);
  };
  return (
    <div ref={setRoot} className={styles.root}>
      <IconButton
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        icon={icon}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          onKeyDown={onKeyDown}
        >
          <MenuItems items={items} onPick={close} />
        </div>
      )}
    </div>
  );
}

/** Opciones del menú: cierran el menú (foco al disparador) y ejecutan su acción. */
function MenuItems({ items, onPick }: { items: readonly MenuItem[]; onPick: () => void }) {
  return items.map((item) => (
    <button
      key={item.label}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={item.tone === 'danger' ? `${styles.item} ${styles.danger}` : styles.item}
      onClick={() => {
        onPick();
        item.onSelect();
      }}
    >
      {item.label}
    </button>
  ));
}
