const PILLARS: { pillar: string; where: string; level: string; sources: string; caution: string }[] = [
  {
    pillar: "Marco conceptual: integración + entorno",
    where: "Índice RHI por áreas",
    level: "PEER",
    sources: "Tinto (1975, 1993); Pascarella & Terenzini (1980); Bean & Metzner (1985)",
    caution: "En estudiantes no tradicionales pesa más lo financiero y logístico que la vida social del recinto.",
  },
  {
    pillar: "Detección temprana",
    where: "RHI, panel y cola “Atender primero”",
    level: "PEER",
    sources: "Arnold & Pistilli (2012); Akçapınar et al. (2019); Herodotou et al. (2019)",
    caution: "El semáforo predice; retiene la intervención que dispara. Por eso empieza por reglas.",
  },
  {
    pillar: "Gestión proactiva de casos",
    where: "Casos de ciclo cerrado",
    level: "PEER (RCT)",
    sources: "Schwebel et al. (2012); Donaldson et al. (2016); Rios (2019)",
    caution: "Cada caso cierra con resultado documentado para medir el efecto real.",
  },
  {
    pillar: "Nudges conductuales",
    where: "Agente Pulso y política anti-spam",
    level: "PEER (RCT)",
    sources: "Castleman & Page (2016); Castleman & Meyer (2020); Bird et al. (2021)",
    caution: "Efectos modestos: complemento de bajo costo, no el motor de la retención.",
  },
  {
    pillar: "Pertenencia y onboarding",
    where: "Agente Bienvenida",
    level: "PEER (RCT) + META",
    sources: "Walton & Cohen (2011); Yeager et al. (2016); Broda et al. (2018)",
    caution: "Funciona en ciertos contextos y estudiantes; hay que medirlo en la cohorte de ICPR.",
  },
  {
    pillar: "IA conversacional",
    where: "Bienvenida, Mentor IA, Enlace, Seguimiento",
    level: "PEER (RCT) + META",
    sources: "Page & Gehlbach (2017); Labadze et al. (2023); Wu & Yu (2023)",
    caution: "Riesgos de privacidad, alucinaciones y sobre-dependencia: la IA escala al equipo humano.",
  },
  {
    pillar: "Bienestar con frontera humana",
    where: "Agente Acompaña y detección de crisis",
    level: "META (acotada)",
    sources: "Frontiers in Psychiatry (2025); Scholes (2016)",
    caution: "Ninguna crisis se resuelve por IA: derivación inmediata a una persona.",
  },
  {
    pillar: "Equidad y gobernanza",
    where: "Auditoría de sesgo, FERPA, registro",
    level: "PEER",
    sources: "Bird et al. (2024); Herodotou et al. (2019); Scholes (2016)",
    caution: "La evidencia de sesgo viene de community colleges: la salvaguarda es central.",
  },
  {
    pillar: "Economía de la retención",
    where: "Caso financiero",
    level: "REP",
    sources: "Schneider & Yin (2012); Schneider (2010); Educational Policy Institute (2013)",
    caution: "Las cifras del plan se derivan del P&L de ICPR y son ilustrativas.",
  },
];

export function Evidence() {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Evidencia</h1>
          <p>
            Cada parte de la app responde a un pilar del Anexo A · Fundamentación Científica del Plan Maestro de
            Retención (ICPR-IA-2026-006-A, v1.0).
          </p>
        </div>
      </header>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pilar</th>
              <th>Dónde vive en la app</th>
              <th>Evidencia</th>
              <th>Fuentes</th>
              <th>Cautela</th>
            </tr>
          </thead>
          <tbody>
            {PILLARS.map((p) => (
              <tr key={p.pillar} style={{ cursor: "default" }}>
                <td><strong>{p.pillar}</strong></td>
                <td className="small">{p.where}</td>
                <td><span className="badge plain tone-info">{p.level}</span></td>
                <td className="small">{p.sources}</td>
                <td className="small muted">{p.caution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
