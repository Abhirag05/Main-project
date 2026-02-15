interface UserAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Get initials from full name
 */
function getInitials(name: string): string {
  const names = name.split(" ");
  if (names.length >= 2) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name.substring(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
};

export default function UserAvatar({ name, size = "md", className = "" }: UserAvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} bg-primary rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
