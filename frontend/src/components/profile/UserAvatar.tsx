import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  textClassName?: string;
}

/**
 * Reusable avatar component. Shows the profile picture if available,
 * otherwise renders styled initials on a gradient background.
 */
export function UserAvatar({
  src,
  name,
  className,
  textClassName,
}: UserAvatarProps) {
  const initials =
    name
      .split(" ")
      .map((p) => p.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary/10">
          <span
            className={cn(
              "text-3xl font-serif font-bold text-primary",
              textClassName,
            )}
          >
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
