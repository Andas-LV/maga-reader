"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = { src: string | null; onClose: () => void };

export function Lightbox({ src, onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 text-white/60 transition-colors hover:text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt=""
        className="max-h-[95vh] max-w-[95vw] rounded object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
