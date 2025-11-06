"use client";

import React, { useEffect, useRef } from "react";
import styles from "./Modal.module.scss";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const el = ref.current;
    // focus first focusable inside modal or modal container
    const focusable = el?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    (focusable || el)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // restore focus
      prevActive?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        // close when click outside content
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        ref={ref}
        role="document"
        className={`${styles.modalContent} ${styles[`modalSize${size.charAt(0).toUpperCase() + size.slice(1)}`]}`}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button aria-label="Fechar" className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
