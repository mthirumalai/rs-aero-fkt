import React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "compact" | "emphasized";
}

/**
 * Reusable form section component
 * Consolidates the repeated section header and layout patterns found across forms
 * Used in: FktSubmitForm, CourseSubmitForm, CourseSubmitFormWithGpx, and others
 */
export function FormSection({
  title,
  description,
  children,
  className,
  variant = "default"
}: FormSectionProps) {
  const sectionVariants = {
    default: "border rounded-lg p-4 space-y-4",
    compact: "border rounded-md p-3 space-y-3",
    emphasized: "border-2 rounded-lg p-6 space-y-4 bg-muted/20"
  };

  const titleVariants = {
    default: "font-semibold text-sm uppercase tracking-wide text-muted-foreground",
    compact: "font-medium text-sm text-muted-foreground",
    emphasized: "font-semibold text-base text-foreground"
  };

  return (
    <div className={cn(sectionVariants[variant], className)}>
      <div className="space-y-1">
        <h3 className={titleVariants[variant]}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Compact variant for smaller sections
 */
export function FormSectionCompact(props: Omit<FormSectionProps, 'variant'>) {
  return <FormSection {...props} variant="compact" />;
}

/**
 * Emphasized variant for important sections
 */
export function FormSectionEmphasized(props: Omit<FormSectionProps, 'variant'>) {
  return <FormSection {...props} variant="emphasized" />;
}