"use client";

interface MobileToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export default function MobileToast({ message, type, onDismiss }: MobileToastProps) {
  return (
    <div
      className="mobile-toast fixed inset-x-3 z-[950] rounded-xl border px-4 py-3 text-sm font-medium shadow-lg bottom-[5.5rem] lg:bottom-auto lg:right-4 lg:top-20 lg:max-w-sm"
      role="status"
      aria-live="polite"
      style={{
        borderColor: type === "success" ? "#a7f3d0" : "#fecaca",
        background: type === "success" ? "#ecfdf5" : "#fef2f2",
        color: type === "success" ? "#065f46" : "#991b1b",
      }}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-2 py-1 text-xs opacity-70"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
