import { avatarColor, initials } from "@/lib/avatar";

export function Avatar({
  id,
  name,
  size = "sm",
}: {
  id: string;
  name: string;
  size?: "sm" | "md";
}) {
  const { bg, text } = avatarColor(id);
  const sizeClass = size === "md" ? "h-9 w-9 text-sm" : "h-6 w-6 text-[10px]";

  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${bg} ${text} ${sizeClass}`}
    >
      {initials(name)}
    </span>
  );
}
