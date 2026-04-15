import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        // Status variants for common alert patterns
        success: "bg-status-success-light border-status-success text-status-success-dark",
        error: "bg-status-error-light border-status-error text-status-error-dark",
        warning: "bg-status-warning-light border-status-warning text-status-warning-dark",
        info: "bg-status-info-light border-status-info text-status-info-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

// Specialized components for common patterns
interface StatusMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: "success" | "error" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
}

const StatusMessage = React.forwardRef<HTMLDivElement, StatusMessageProps>(
  ({ variant, title, children, className, ...props }, ref) => (
    <Alert variant={variant} className={className} ref={ref} {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
);
StatusMessage.displayName = "StatusMessage";

// Success-specific component for large success states
interface SuccessCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

const SuccessCard = React.forwardRef<HTMLDivElement, SuccessCardProps>(
  ({ title, description, children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-center py-12 bg-status-success-light rounded-lg border border-status-success",
        className
      )}
      {...props}
    >
      <h3 className="text-2xl font-bold text-status-success-dark mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-status-success-dark mb-4">{description}</p>
      )}
      {children}
    </div>
  )
);
SuccessCard.displayName = "SuccessCard";

export {
  Alert,
  AlertTitle,
  AlertDescription,
  StatusMessage,
  SuccessCard,
  alertVariants
};