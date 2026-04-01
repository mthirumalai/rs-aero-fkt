import Link from "next/link";
import Image from "next/image";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div style={{ backgroundColor: "#ffffff", height: "60px" }} className="border-b flex items-center px-4 relative">
      {/* Left side - Logo */}
      <div className="flex items-center h-full">
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
      </div>

      {/* Center - Title */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col justify-center text-center">
        <h1 className="text-2xl font-bold text-foreground whitespace-nowrap">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground whitespace-nowrap">{description}</p>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="ml-auto">
        {actions && (
          <div className="flex items-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}