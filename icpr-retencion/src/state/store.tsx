import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { computeRhi } from "../domain/rhi";
import { seedStudents } from "../domain/seed";
import { DEFAULT_POLICY, fillTemplate, type NudgePolicy } from "../domain/nudges";
import { AGENTS } from "../domain/agents";
import type {
  AuditEntry,
  CaseOutcome,
  CaseStatus,
  Nudge,
  RetentionCase,
  RhiResult,
  Student,
} from "../domain/types";

export interface State {
  students: Student[];
  cases: RetentionCase[];
  nudges: Nudge[];
  audit: AuditEntry[];
  policy: NudgePolicy;
  user: string;
}

type Action =
  | { type: "openCase"; studentId: string; owner: string; note?: string }
  | { type: "addNote"; caseId: string; text: string; contact?: boolean }
  | { type: "setStatus"; caseId: string; status: CaseStatus }
  | { type: "closeCase"; caseId: string; outcome: CaseOutcome; note: string }
  | { type: "sendNudge"; nudge: Omit<Nudge, "id" | "at"> }
  | { type: "updateStudent"; studentId: string; patch: Partial<Pick<Student, "consent" | "contactPaused">> }
  | { type: "escalate"; studentId: string; reason: string }
  | { type: "setPolicy"; policy: NudgePolicy }
  | { type: "reset" };

const KEY = "icpr-retencion:v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function initialState(): State {
  const students = seedStudents();
  const cases: RetentionCase[] = [];
  const nudges: Nudge[] = [];
  students.forEach((s, i) => {
    const r = computeRhi(s.signals);
    if ((r.level === "rojo" || s.signals.wellbeingConcern) && r.primaryArea) {
      const opened = 20 + i * 3;
      cases.push({
        id: uid(),
        studentId: s.id,
        openedAt: hoursAgo(opened),
        firstContactAt: i % 3 === 0 ? undefined : hoursAgo(opened - 6),
        area: r.primaryArea,
        level: r.level,
        owner: r.primaryArea === "bienestar" ? "Consejería" : "Asesoría académica",
        status: r.primaryArea === "bienestar" ? "escalado" : i % 3 === 0 ? "abierto" : "en_progreso",
        notes: [
          { at: hoursAgo(opened), by: "Sistema RHI", text: `Caso abierto automáticamente: RHI ${r.score} (${r.factors[0]?.reason ?? "riesgo"}).` },
        ],
      });
    }
    if (r.level === "amarillo" && s.consent && !s.contactPaused && !s.signals.wellbeingConcern && i % 2 === 0) {
      const agent = r.suggestedAgent === "acompana" ? "pulso" : r.suggestedAgent;
      nudges.push({
        id: uid(),
        studentId: s.id,
        at: hoursAgo(30 + i),
        channel: "whatsapp",
        agent,
        text: fillTemplate(AGENTS[agent].templates[0], s),
      });
    }
  });
  return {
    students,
    cases,
    nudges,
    audit: [{ at: now(), actor: "Sistema", action: "Datos de demostración cargados (64 estudiantes sintéticos)" }],
    policy: DEFAULT_POLICY,
    user: "Asesor/a ICPR",
  };
}

function log(state: State, action: string, actor = state.user): AuditEntry[] {
  return [{ at: now(), actor, action }, ...state.audit].slice(0, 300);
}

const nameOf = (state: State, id: string) => state.students.find((s) => s.id === id)?.name ?? id;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "openCase": {
      const s = state.students.find((x) => x.id === action.studentId);
      if (!s) return state;
      if (state.cases.some((c) => c.studentId === s.id && c.status !== "cerrado")) return state;
      const r = computeRhi(s.signals);
      const c: RetentionCase = {
        id: uid(),
        studentId: s.id,
        openedAt: now(),
        area: r.primaryArea ?? "compromiso",
        level: r.level,
        owner: action.owner,
        status: r.primaryArea === "bienestar" ? "escalado" : "abierto",
        notes: [{ at: now(), by: state.user, text: action.note ?? `Caso abierto con RHI ${r.score}.` }],
      };
      return { ...state, cases: [c, ...state.cases], audit: log(state, `Abrió caso para ${s.name}`) };
    }
    case "addNote":
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.caseId
            ? {
                ...c,
                status: c.status === "abierto" && action.contact ? "en_progreso" : c.status,
                firstContactAt: c.firstContactAt ?? (action.contact ? now() : undefined),
                notes: [...c.notes, { at: now(), by: state.user, text: action.text }],
              }
            : c,
        ),
      };
    case "setStatus":
      return {
        ...state,
        cases: state.cases.map((c) => (c.id === action.caseId ? { ...c, status: action.status } : c)),
      };
    case "closeCase": {
      const c = state.cases.find((x) => x.id === action.caseId);
      if (!c || !action.note.trim()) return state;
      return {
        ...state,
        cases: state.cases.map((x) =>
          x.id === action.caseId
            ? {
                ...x,
                status: "cerrado",
                outcome: action.outcome,
                closedAt: now(),
                notes: [...x.notes, { at: now(), by: state.user, text: `Cierre (${action.outcome}): ${action.note}` }],
              }
            : x,
        ),
        audit: log(state, `Cerró caso de ${nameOf(state, c.studentId)} como “${action.outcome}”`),
      };
    }
    case "sendNudge": {
      const n: Nudge = { ...action.nudge, id: uid(), at: now() };
      return {
        ...state,
        nudges: [n, ...state.nudges],
        audit: log(state, `Envió mensaje de ${n.agent} a ${nameOf(state, n.studentId)} por ${n.channel}`),
      };
    }
    case "updateStudent":
      return {
        ...state,
        students: state.students.map((s) => (s.id === action.studentId ? { ...s, ...action.patch } : s)),
        audit: log(
          state,
          `Actualizó ${Object.entries(action.patch)
            .map(([k, v]) => `${k === "consent" ? "consentimiento" : "pausa de contacto"} = ${v ? "sí" : "no"}`)
            .join(", ")} de ${nameOf(state, action.studentId)}`,
        ),
      };
    case "escalate": {
      const s = state.students.find((x) => x.id === action.studentId);
      if (!s) return state;
      const open = state.cases.find((c) => c.studentId === s.id && c.status !== "cerrado");
      const note = { at: now(), by: "Agente Acompaña", text: `Derivación inmediata a Consejería: ${action.reason}` };
      const cases = open
        ? state.cases.map((c) =>
            c.id === open.id ? { ...c, status: "escalado" as const, owner: "Consejería", area: "bienestar" as const, notes: [...c.notes, note] } : c,
          )
        : [
            {
              id: uid(),
              studentId: s.id,
              openedAt: now(),
              area: "bienestar" as const,
              level: "rojo" as const,
              owner: "Consejería",
              status: "escalado" as const,
              notes: [note],
            },
            ...state.cases,
          ];
      return {
        ...state,
        cases,
        students: state.students.map((x) =>
          x.id === s.id ? { ...x, signals: { ...x.signals, wellbeingConcern: true } } : x,
        ),
        audit: log(state, `Derivó a ${s.name} a Consejería (${action.reason})`, "Agente Acompaña"),
      };
    }
    case "setPolicy":
      return { ...state, policy: action.policy, audit: log(state, "Cambió la política anti-spam de Pulso") };
    case "reset":
      return initialState();
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* almacenamiento no disponible: se usan datos nuevos */
  }
  return initialState();
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  rhi: Map<string, RhiResult>;
  student: (id: string) => Student | undefined;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* sin persistencia */
    }
  }, [state]);

  const rhi = useMemo(
    () => new Map(state.students.map((s) => [s.id, computeRhi(s.signals)])),
    [state.students],
  );

  const value = useMemo<Ctx>(
    () => ({ state, dispatch, rhi, student: (id) => state.students.find((s) => s.id === id) }),
    [state, rhi],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fuera de StoreProvider");
  return ctx;
}
