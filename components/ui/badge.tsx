import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "destructive" | "secondary";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-blue-500 text-white",
      outline: "border border-gray-300 bg-transparent",
      destructive: "bg-red-500 text-white",
      secondary: "bg-gray-500 text-white",
    };

    return (
      <div
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
          variantClasses[variant]
        } ${className || ""}`}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
