interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="bg-background h-[60px] border-b flex items-center px-4 relative">
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