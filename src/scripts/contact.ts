for (const shell of document.querySelectorAll<HTMLElement>("[data-project-brief]")) {
  const form = shell.querySelector<HTMLFormElement>("[data-brief-form]");
  const steps = [...shell.querySelectorAll<HTMLFieldSetElement>("[data-brief-step]")];
  const progress = shell.querySelector<HTMLElement>("[data-brief-progress]");
  const error = shell.querySelector<HTMLElement>("[data-brief-error]");
  const success = shell.querySelector<HTMLElement>("[data-brief-success]");
  const submit = shell.querySelector<HTMLButtonElement>("[data-submit]");
  const startedAt = shell.querySelector<HTMLInputElement>("[data-started-at]");
  const token = shell.querySelector<HTMLInputElement>("[data-idempotency-key]");
  const errorCopy = shell.querySelector<HTMLTemplateElement>("[data-error-copy]");
  const demoMode = shell.dataset.deliveryMode === "demo";
  const isRu = shell.dataset.locale === "ru";
  const review = shell.querySelector<HTMLElement>("[data-brief-review]");
  let current = 0;
  let sending = false;

  if (!form || steps.length !== 3 || !progress || !error || !success || !submit || !startedAt || !token) continue;

  startedAt.value = String(Date.now());
  token.value = crypto.randomUUID();

  // Only known service identifiers affect the selection; never copy arbitrary URL text.
  const params = new URLSearchParams(location.search);
  const serviceCategories: Record<string, string> = { brand: "brand", web: "website", connect: "connected" };
  const goalCategories: Record<string, string> = { launch: "website", reframe: "website", connect: "connected" };
  const category = serviceCategories[params.get("service") ?? ""] ?? goalCategories[params.get("goal") ?? ""];
  if (category) {
    const choice = [...form.querySelectorAll<HTMLInputElement>('input[name="category"]')].find((input) => input.value === category);
    if (choice) choice.checked = true;
  }

  const readableValue = (name: string) => {
    const control = form.elements.namedItem(name);
    if (control instanceof RadioNodeList) return [...control].find((item) => item instanceof HTMLInputElement && item.checked)?.parentElement?.textContent?.trim() ?? "";
    if (control instanceof HTMLSelectElement) return control.selectedOptions[0]?.textContent?.trim() ?? "";
    return control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement ? control.value : "";
  };
  const summaryFields = [
    ["category", isRu ? "Задача" : "Project"],
    ["deliveryWindow", isRu ? "Срок" : "Timing"],
    ["budget", isRu ? "Формат" : "Scope"],
  ];
  const updateReview = () => {
    if (!review) return;
    review.replaceChildren(...summaryFields.map(([name, label]) => {
      const item = document.createElement("p");
      item.textContent = `${label}: ${readableValue(name)}`;
      return item;
    }));
    review.hidden = false;
  };
  shell.querySelector<HTMLButtonElement>("[data-download-brief]")?.addEventListener("click", () => {
    const fields = [...summaryFields, ["context", isRu ? "Описание" : "Context"], ["siteUrl", isRu ? "Сайт" : "Website"], ["name", isRu ? "Имя" : "Name"], ["email", "Email"], ["company", isRu ? "Компания" : "Company"]];
    const content = `Povkh.Dev\n\n${fields.map(([name, label]) => `${label}: ${readableValue(name)}`).join("\n\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "povkh-project-brief.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const showStep = (index: number, moveFocus = true) => {
    current = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== current; });
    progress.textContent = `${current + 1} / ${steps.length}`;
    progress.setAttribute("aria-valuenow", String(current + 1));
    if (current === 2) updateReview();
    if (moveFocus) steps[current].querySelector<HTMLElement>("input, textarea, select")?.focus();
  };

  const validStep = () => {
    for (const control of steps[current].querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      if (!control.checkValidity()) {
        control.reportValidity();
        control.focus();
        return false;
      }
    }
    return true;
  };

  for (const next of shell.querySelectorAll<HTMLButtonElement>("[data-next]")) {
    next.addEventListener("click", () => { if (validStep()) showStep(current + 1); });
  }
  for (const back of shell.querySelectorAll<HTMLButtonElement>("[data-back]")) {
    back.addEventListener("click", () => showStep(current - 1));
  }

  const send = async () => {
    if (sending || !form.reportValidity()) return;
    sending = true;
    submit.disabled = true;
    error.hidden = true;

    if (demoMode) {
      form.hidden = true;
      progress.hidden = true;
      success.hidden = false;
      success.focus();
      sending = false;
      return;
    }

    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    Object.assign(payload, {
      consent: data.has("consent"),
      startedAt: Number(data.get("startedAt")),
    });

    let category = "delivery_unavailable";
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { category?: string };
      category = body.category ?? category;
      if (response.ok && category === "accepted") {
        form.hidden = true;
        progress.hidden = true;
        success.hidden = false;
        success.focus();
        return;
      }
    } catch {
      category = "delivery_unavailable";
    } finally {
      sending = false;
      submit.disabled = false;
    }

    const message = category === "rate_limited"
      ? errorCopy?.dataset.rate
      : category === "validation_error"
        ? errorCopy?.dataset.invalid
        : errorCopy?.dataset.default;
    error.textContent = message ?? "Delivery unavailable";
    error.hidden = false;
    error.focus();
    submit.textContent = submit.dataset.retryLabel ?? "Retry";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void send();
  });
  if (demoMode) submit.addEventListener("click", () => { void send(); });
  showStep(0, false);
}
