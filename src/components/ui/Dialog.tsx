import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
  className?: string;
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  drawer = false,
  className,
}: DialogProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const root = document.getElementById("root");
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    document.body.style.overflow = "hidden";
    const focus = window.setTimeout(() => panel.current?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const targets = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea, [tabindex="0"]',
        ) ?? [],
      ).filter((node) => !node.closest("[hidden]"));
      const first = targets[0];
      const last = targets.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      window.clearTimeout(focus);
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      if (root) root.inert = wasInert;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-[60] flex",
            drawer ? "justify-end" : "items-center justify-center p-3 sm:p-6",
          )}
        >
          <motion.div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            onClick={() => close.current()}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={description ? `${id}-description` : undefined}
            tabIndex={-1}
            className={cn(
              "relative flex w-full flex-col bg-white shadow-drawer outline-none",
              drawer
                ? "h-full max-w-[650px]"
                : "max-h-[90dvh] max-w-[580px] rounded-[22px]",
              className,
            )}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : drawer
                  ? { x: 70, opacity: 0 }
                  : { y: 16, opacity: 0, scale: 0.98 }
            }
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, ...(drawer ? { x: 30 } : { y: 10 }) }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-5 py-5 sm:px-7">
              <div>
                <h2
                  id={`${id}-title`}
                  className="font-display text-lg font-bold text-navy-900"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id={`${id}-description`}
                    className="mt-1 text-xs leading-relaxed text-navy-500"
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => close.current()}
                aria-label={`Close ${title}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-surface-subtle"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
