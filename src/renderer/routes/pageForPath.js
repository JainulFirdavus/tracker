import { pages } from "../app/menu";

export function pageForPath(pathname) {
  const requested = pathname.split("/").filter(Boolean)[0] ?? "overview";
  return pages.some(([id]) => id === requested) ? requested : null;
}
