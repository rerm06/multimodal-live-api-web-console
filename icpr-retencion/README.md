# Retención ICPR · Programa AIA

Plataforma de retención proactiva con agentes de IA para ICPR Junior College. Implementa el Plan Maestro de
Retención y su Anexo A (Fundamentación Científica, ICPR-IA-2026-006-A v1.0).

Funciona con **datos sintéticos** (64 estudiantes de demostración); ningún dato es real.

## Qué incluye

| Pantalla | Qué hace |
| --- | --- |
| Panel | Distribución verde/amarillo/rojo, cola "Atender primero" y qué área causa el riesgo. |
| Estudiantes | Lista filtrable ordenada por riesgo. La ficha explica cada punto del índice y sugiere el siguiente paso. |
| Casos | Gestión de ciclo cerrado: sin contactar → seguimiento → escalado → cerrado con resultado obligatorio. |
| Agentes IA | Bienvenida, Mentor IA, Enlace, Pulso, Seguimiento y Acompaña. Detección de crisis y malestar antes de llamar al modelo. |
| Mensajes | Nudges por WhatsApp/SMS/correo con política anti-spam (tope semanal, horas mínimas entre mensajes, horario de silencio, consentimiento). |
| Gobernanza | Auditoría de sesgo del índice (regla de cuatro quintos), consentimiento FERPA, pausa de contacto y registro de acciones. |
| Caso financiero | Calculadora de ROI con el ejemplo ilustrativo del plan (85 % → 92 %). |
| Evidencia | Cada pilar del plan, dónde vive en la app, sus fuentes y su cautela. |

### Índice de Salud de Retención (RHI)

`src/domain/rhi.ts`. De 0 a 100 (más alto = más sano): verde ≥ 70, amarillo 45–69, rojo < 45. Son reglas
explicables por área (académica, compromiso en el LMS, financiera, vida y logística, pertenencia, bienestar), con
tope por área para que ninguna señal aislada hunda el índice. Rojo o cualquier señal de bienestar exigen una persona.

### Frontera humana

`src/domain/safety.ts` detecta lenguaje de crisis o malestar en español. Si aparece, la conversación nunca llega al
modelo: se responde con un texto fijo (Línea PAS 1-800-981-0023, 988, 911), se abre o escala un caso a Consejería y
el estudiante queda marcado para que Pulso no le envíe recordatorios. La misma verificación corre en el servidor.

## Desarrollo

```bash
cd icpr-retencion
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas del motor (RHI, nudges, seguridad, sesgo, ROI)
npm run build
```

Sin servidor de funciones, los agentes responden en **modo sin conexión** con respuestas guía. Para probar Gemini en
local usa `netlify dev` con `GEMINI_API_KEY` en el entorno.

## Despliegue en Netlify

`netlify.toml` (en la raíz del repo) ya apunta a esta carpeta. En el sitio de Netlify configura:

- `GEMINI_API_KEY`: clave de Google AI Studio. Vive solo en el servidor (`netlify/functions/agent.mts`).
- `GEMINI_MODEL` (opcional): modelo a usar; por defecto `gemini-2.5-flash`.

Al modelo solo se envía el primer nombre del estudiante y un resumen de sus señales.

## Pendiente para producción

- Conectar datos reales del LMS y de Registraduría/Asistencia Económica en lugar del generador sintético.
- Autenticación del personal y control de acceso por rol.
- Persistencia en servidor (hoy el estado se guarda en el navegador).
- Proveedor real de mensajería (WhatsApp Business API o Twilio).
- Validar umbrales del RHI y la auditoría de sesgo con cohortes reales de ICPR.
