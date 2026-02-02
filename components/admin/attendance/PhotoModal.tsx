"use client";

import { X } from "lucide-react";

interface PhotoModalProps {
  url: string;
  type: string;
  onClose: () => void;
}

export function PhotoModal({ url, type, onClose }: PhotoModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-[#ff3b30]"
        >
          <X className="w-8 h-8" />
        </button>
        <p className="text-white text-center mb-4 text-lg font-medium">
          รูปถ่าย{type}
        </p>
        <img
          src={url}
          alt={`รูป${type}`}
          className="w-full rounded-2xl shadow-2xl"
        />
      </div>
    </div>
  );
}
