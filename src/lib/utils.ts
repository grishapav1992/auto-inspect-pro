import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — объединяет CSS-классы через clsx и tailwind-merge,
 * корректно разрешая конфликты Tailwind-утилит.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
