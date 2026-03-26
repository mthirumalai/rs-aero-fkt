import Link from "next/link";
import Image from "next/image";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div style={{ backgroundColor: "#ffffff", height: "60px" }} className="border-b flex items-center justify-between px-4">
      {/* Left side - Logo and Title */}
      <div className="flex items-center gap-6 h-full">
        <Link href="/" className="flex items-center h-full py-2">
          <Image
            src="/logo.png"
            alt="RS Aero FKT"
            width={324}
            height={55}
            className="h-full w-auto"
            priority
          />
        </Link>
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      {actions && (
        <div className="flex items-center">
          {actions}
        </div>
      )}
    </div>
  );
}