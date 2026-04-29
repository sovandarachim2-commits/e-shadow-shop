import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`focus-ring w-full rounded-xl border border-[#f3c7b8]/70 bg-white px-4 py-3 text-sm text-[#082b4c] outline-none transition placeholder:text-[#8b99aa] ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`focus-ring min-h-28 w-full rounded-xl border border-[#f3c7b8]/70 bg-white px-4 py-3 text-sm text-[#082b4c] outline-none transition placeholder:text-[#8b99aa] ${className}`}
      {...props}
    />
  );
}
