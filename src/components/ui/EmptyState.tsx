interface EmptyStateProps {
  children: string;
  className?: string;
}

export function EmptyState({ children, className = "" }: EmptyStateProps) {
  return <p className={`p-10 text-center text-lightest ${className}`.trim()}>{children}</p>;
}
