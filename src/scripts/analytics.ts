type ConsentState = "granted" | "denied";
type EventName = "cta_click" | "case_open" | "brief_start" | "brief_submit";
type Surface = "home" | "work" | "services" | "contact";

interface TrackDetail { name: EventName; surface: Surface }

const storageKey = "povkh-consent";
const eventNames = new Set<EventName>(["cta_click", "case_open", "brief_start", "brief_submit"]);
const surfaces = new Set<Surface>(["home", "work", "services", "contact"]);
let sessionConsent: ConsentState | null = null;
function readConsent(): ConsentState | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "granted" || value === "denied" ? value : sessionConsent;
  } catch { return sessionConsent; }
}

function setConsent(state: ConsentState) {
  sessionConsent = state;
  try { localStorage.setItem(storageKey, state); } catch { /* Keep this choice for the current page when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent("povkh:consent", { detail: state }));
}

function send(detail: TrackDetail) {
  const endpoint = document.querySelector<HTMLMetaElement>('meta[name="povkh-analytics-endpoint"]')?.content;
  if (readConsent() !== "granted" || !endpoint) return;
  if (!eventNames.has(detail.name) || !surfaces.has(detail.surface)) return;
  const body = JSON.stringify({ name: detail.name, surface: detail.surface });
  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}

function syncControls(root: HTMLElement) {
  root.hidden = !document.querySelector<HTMLMetaElement>('meta[name="povkh-analytics-endpoint"]')?.content;
  const state = readConsent();
  root.dataset.state = state ?? "unset";
  const prompt = root.querySelector<HTMLElement>("[data-consent-prompt]");
  const withdraw = root.querySelector<HTMLButtonElement>("[data-consent-withdraw]");
  if (prompt) prompt.hidden = state !== null;
  if (withdraw) withdraw.hidden = state !== "granted";
}

document.querySelectorAll<HTMLElement>("[data-consent-controls]").forEach((root) => {
  syncControls(root);
  root.querySelectorAll<HTMLButtonElement>("[data-consent]").forEach((button) => {
    button.addEventListener("click", () => {
      const state = button.dataset.consent;
      if (state === "granted" || state === "denied") setConsent(state);
      syncControls(root);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-consent-withdraw]")?.addEventListener("click", () => {
    setConsent("denied");
    syncControls(root);
  });
});

window.addEventListener("povkh:track", (event) => {
  const detail = (event as CustomEvent<TrackDetail>).detail;
  if (detail && typeof detail === "object") send(detail);
});
