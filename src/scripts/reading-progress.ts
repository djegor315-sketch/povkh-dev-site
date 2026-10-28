const progress = document.querySelector<HTMLElement>("[data-reading-progress]");
if (progress) {
  let frame = 0;
  let range = 1;
  const paint = () => {
    frame = 0;
    const value = Math.min(1, Math.max(0, scrollY / range));
    progress.style.setProperty("--reading-progress", String(value));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  const measure = () => {
    range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    schedule();
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", measure, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  measure();
}
