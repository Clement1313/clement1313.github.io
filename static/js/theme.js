// Runs in <head> (before first paint) so the saved theme is applied without a flash.
(() => {
  const KEY = "theme";
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked: choice lasts for this page only */ } };

  const saved = read();
  const label = () => {
    const button = document.getElementById("theme-toggle");
    if (button) button.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  };
  const apply = (theme) => {
    root.setAttribute("data-theme", theme);
    label();
  };
  apply(saved === "light" || saved === "dark" ? saved : media.matches ? "dark" : "light");

  // Until the visitor chooses, keep following the system setting.
  media.addEventListener("change", (e) => { if (!read()) apply(e.matches ? "dark" : "light"); });

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    button.hidden = false;
    label();
    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      apply(next);
      write(next);
    });
  });
})();
