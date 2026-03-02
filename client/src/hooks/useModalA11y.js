import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * Modal accessibility: focus trap, restore focus on close, optional initial focus.
 * @param {boolean} isOpen - whether the modal is visible
 * @param {Object} modalRef - ref to the modal container element
 * @param {Object} [triggerRef] - ref to the element that opened the modal (for restore)
 * @param {Function} onClose - called when modal should close (e.g. ESC)
 */
export function useModalA11y(isOpen, modalRef, triggerRef, onClose) {
  const previousFocusRef = useRef(null);

  const getFocusable = useCallback((el) => {
    if (!el) return [];
    const nodes = el.querySelectorAll(FOCUSABLE);
    return Array.from(nodes).filter((n) => {
      const style = window.getComputedStyle(n);
      return style.display !== "none" && style.visibility !== "hidden" && !n.disabled;
    });
  }, []);

  // Save focus when opening; restore when closing
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    } else {
      const toRestore = triggerRef?.current || previousFocusRef.current;
      if (toRestore && typeof toRestore.focus === "function") {
        toRestore.focus();
      }
      previousFocusRef.current = null;
    }
  }, [isOpen, triggerRef]);

  // Focus trap: Tab cycles within modal
  useEffect(() => {
    if (!isOpen || !modalRef?.current) return;
    const modal = modalRef.current;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable(modal);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const currentIdx = focusable.indexOf(document.activeElement);

      if (e.shiftKey) {
        if (currentIdx <= 0) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (currentIdx === -1 || currentIdx >= focusable.length - 1) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modal.addEventListener("keydown", handleKeyDown);
    return () => modal.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, modalRef, onClose, getFocusable]);
}
