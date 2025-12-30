import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-text-light/50 text-text-light selection:bg-indigo selection:text-white border-indigo/30 flex w-full min-w-0 rounded-md border px-4 py-2 text-lg bg-card-bg transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-indigo focus-visible:ring-indigo/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-error/20 aria-invalid:border-error",
        className
      )}
      {...props}
    />
  );
}

export { Input };
