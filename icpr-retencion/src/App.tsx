import { useCallback, useState } from "react";
import { Icon } from "./components/Icon";
import { StudentDrawer } from "./components/StudentDrawer";
import { go, useLocation, type Route } from "./router";
import { useStore } from "./state/store";
import { Agents } from "./views/Agents";
import { Cases } from "./views/Cases";
import { Dashboard } from "./views/Dashboard";
import { Evidence } from "./views/Evidence";
import { Governance } from "./views/Governance";
import { Nudges } from "./views/Nudges";
import { Roi } from "./views/Roi";
import { Students } from "./views/Students";

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: "panel", label: "Panel", icon: "panel" },
  { route: "estudiantes", label: "Estudiantes", icon: "users" },
  { route: "casos", label: "Casos", icon: "folder" },
  { route: "agentes", label: "Agentes IA", icon: "chat" },
  { route: "mensajes", label: "Mensajes", icon: "send" },
  { route: "gobernanza", label: "Gobernanza", icon: "shield" },
  { route: "roi", label: "Caso financiero", icon: "chart" },
  { route: "evidencia", label: "Evidencia", icon: "book" },
];

export function App() {
  const loc = useLocation();
  const { state } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const onOpen = useCallback((id: string) => setOpenId(id), []);
  const onClose = useCallback(() => setOpenId(null), []);
  const uncontacted = state.cases.filter((c) => c.status === "abierto").length;

  const nav = NAV.map((n) => (
    <button
      key={n.route}
      className="nav-btn"
      aria-current={loc.route === n.route ? "page" : undefined}
      onClick={() => {
        setOpenId(null);
        go(n.route);
      }}
    >
      <Icon name={n.icon} /> {n.label}
      {n.route === "casos" && uncontacted > 0 && <span className="count num">{uncontacted}</span>}
    </button>
  ));

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Principal">
        <div className="brand">
          <div className="brand-mark">AIA</div>
          <div>
            <strong>Retención ICPR</strong>
            <span>Student Success · Programa AIA</span>
          </div>
        </div>
        {nav}
        <div className="sidebar-foot">Datos sintéticos de demostración. Ningún estudiante real.</div>
      </nav>
      <nav className="mobile-nav" aria-label="Principal">{nav}</nav>
      <main className="main">
        {loc.route === "panel" && <Dashboard onOpen={onOpen} />}
        {loc.route === "estudiantes" && <Students onOpen={onOpen} />}
        {loc.route === "casos" && <Cases loc={loc} onOpen={onOpen} />}
        {loc.route === "agentes" && <Agents loc={loc} />}
        {loc.route === "mensajes" && <Nudges key={loc.params.get("e") ?? ""} loc={loc} />}
        {loc.route === "gobernanza" && <Governance />}
        {loc.route === "roi" && <Roi />}
        {loc.route === "evidencia" && <Evidence />}
      </main>
      {openId && <StudentDrawer id={openId} onClose={onClose} />}
    </div>
  );
}
