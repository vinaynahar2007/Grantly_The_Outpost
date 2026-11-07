import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  BookmarkCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

export type ToastTone = "success" | "info" | "bookmark" | "error";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  showToast: (params: {
    title: string;
    description?: string;
    tone?: ToastTone;
  }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      title,
      description,
      tone = "success",
    }: {
      title: string;
      description?: string;
      tone?: ToastTone;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id, title, description, tone },
      ]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Keep announcements available while a dialog makes the app root inert. */}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:right-6 sm:bottom-6"
        >
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const Icon =
                toast.tone === "error"
                  ? CircleAlert
                  : toast.tone === "bookmark"
                    ? BookmarkCheck
                    : toast.tone === "info"
                      ? Info
                      : CheckCircle2;

              return (
                <motion.div
                  key={toast.id}
                  role={toast.tone === "error" ? "alert" : "status"}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_12px_28px_-6px_rgb(15_23_42_/_0.14)]"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                      toast.tone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : toast.tone === "bookmark"
                          ? "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"
                          : toast.tone === "info"
                            ? "border-[#E2E8F0] bg-[#F8F9FC] text-[#334155]"
                            : "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {toast.title}
                    </p>
                    {toast.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-[#64748B]">
                        {toast.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F172A]"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
