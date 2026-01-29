import { cn } from "@/utils/cn";

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    className?: string;
}

const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
    success: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/20",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
    return (
        <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent", variants[variant], className)}>
            {children}
        </div>
    );
}
