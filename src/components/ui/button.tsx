"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white shadow-lg border border-blue-500/20 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        pressed: "bg-gray-600 text-white shadow-lg border border-gray-500/20 hover:bg-gray-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        destructive: "bg-red-600 text-white shadow-lg border border-red-600/20 hover:bg-red-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        outline: "border border-gray-300 bg-white shadow-md hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
        secondary: "bg-gray-100 text-gray-900 shadow-lg border border-gray-200 hover:bg-gray-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
        ghost: "hover:bg-gray-100 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        link: "text-gray-700 underline-offset-4 hover:underline hover:text-gray-900",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
