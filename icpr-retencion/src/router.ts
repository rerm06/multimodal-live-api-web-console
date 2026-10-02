import { useEffect, useState } from "react";

export type Route = "panel" | "estudiantes" | "casos" | "agentes" | "mensajes" | "gobernanza" | "roi" | "evidencia";

export interface Location {
  route: Route;
  params: URLSearchParams;
}

const ROUTES: Route[] = ["panel", "estudiantes", "casos", "agentes", "mensajes", "gobernanza", "roi", "evidencia"];

function parse(): Location {
  const [path, query] = window.location.hash.replace(/^#\/?/, "").split("?");
  const route = (ROUTES as string[]).includes(path) ? (path as Route) : "panel";
  return { route, params: new URLSearchParams(query ?? "") };
}

export function useLocation(): Location {
  const [loc, setLoc] = useState(parse);
  useEffect(() => {
    const on = () => setLoc(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return loc;
}

export function go(route: Route, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  window.location.hash = `/${route}${q ? `?${q}` : ""}`;
}
