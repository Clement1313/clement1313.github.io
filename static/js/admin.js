(() => {
  const cfg = JSON.parse(document.getElementById("admin-config").textContent);
  const $ = (id) => document.getElementById(id);
  const status = $("status");
  const grid = $("grid");
  let header = [], rows = [], sha = null, dirty = false;

  const setStatus = (msg, isError = false) => {
    status.textContent = msg;
    status.className = isError ? "error" : "";
  };
  const hexToBytes = (hex) => Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));
  const bytesToHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // --- Password gate (client-side only: a convenience, not real security; GitHub enforces the token) ---
  async function passwordOk(password) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: hexToBytes(cfg.salt), iterations: cfg.iterations, hash: "SHA-256" }, key, 256);
    return bytesToHex(bits) === cfg.hash;
  }
  $("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await passwordOk($("login-password").value);
    $("login-error").hidden = ok;
    if (ok) {
      $("login").hidden = true;
      $("editor").hidden = false;
      $("login-password").value = "";
    }
  });

  // --- GitHub API ---
  const apiUrl = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.path}`;
  const gh = (method, url, body) =>
    fetch(url, {
      method,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${$("gh-token").value.trim()}`,
                 ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const fromBase64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  const toBase64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

  async function load() {
    if (dirty && !confirm("Discard your unsaved changes and reload from GitHub?")) return;
    if (!$("gh-token").value.trim()) return setStatus("Enter your GitHub token first.", true);
    setStatus("Loading…");
    try {
      const r = await gh("GET", `${apiUrl}?ref=${encodeURIComponent(cfg.branch)}`);
      if (!r.ok) return setStatus(`GitHub refused the request (${r.status}). Check the token and its permissions.`, true);
      const file = await r.json();
      sha = file.sha;
      const parsed = CSVLite.parse(fromBase64(file.content));
      header = parsed[0];
      rows = parsed.slice(1).map((row) => header.map((_, i) => row[i] ?? ""));
      dirty = false;
      $("workspace").hidden = false;
      render();
      setStatus(`Loaded ${rows.length} rows.`);
    } catch (err) {
      setStatus(`Could not reach GitHub: ${err.message}`, true);
    }
  }

  // --- Validation (a bad value would make the site build fail) ---
  const col = (name) => header.indexOf(name);
  const validDate = (v) => {
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/), y, mo, d;
    if (m) [y, mo, d] = [m[1], m[2], m[3]];
    else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/))) [d, mo, y] = [m[1], m[2], m[3].length === 2 ? "20" + m[3] : m[3]];
    else return false;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d));
    return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +mo - 1 && dt.getUTCDate() === +d;
  };
  const rules = {
    Date: (v) => v === "" || validDate(v) || "date must be YYYY-MM-DD or DD/MM/YYYY",
    "Nombre de concert": (v) => /^\d*$/.test(v.trim()) || "must be a whole number",
    "Coût": (v) => /^\s*(\d+([.,]\d{1,2})?)?\s*€?\s*$/.test(v) || "price must look like 45 or 45,50 €",
  };
  const isBlank = (row) => row.every((v) => v.trim() === "");
  function problems() {
    const out = [];
    rows.forEach((row, r) => {
      if (isBlank(row)) return;
      if (col("Artiste") >= 0 && row[col("Artiste")].trim() === "") out.push([r, col("Artiste"), "artist is required"]);
      Object.entries(rules).forEach(([name, rule]) => {
        const c = col(name);
        if (c < 0) return;
        const res = rule(row[c]);
        if (res !== true) out.push([r, c, res]);
      });
    });
    return out;
  }
  function showProblems(list) {
    const box = $("problems");
    box.replaceChildren(...list.map(([r, c, msg]) => {
      const li = document.createElement("li");
      li.textContent = `Row ${r + 1}, ${header[c]}: ${msg}`;
      return li;
    }));
    box.hidden = list.length === 0;
    grid.querySelectorAll("input").forEach((inp) => {
      const bad = list.some(([r, c]) => r === +inp.dataset.r && c === +inp.dataset.c);
      inp.setAttribute("aria-invalid", String(bad));
    });
  }

  // --- Editor table ---
  const button = (label, title, onClick, danger = false) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    if (danger) b.className = "danger";
    b.addEventListener("click", onClick);
    return b;
  };
  const blankRow = () => header.map(() => "");
  const edit = (fn) => { fn(); dirty = true; render(); };

  function render() {
    grid.replaceChildren();
    const head = grid.createTHead().insertRow();
    ["#", ...header, "Actions"].forEach((h) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      head.append(th);
    });
    const body = grid.createTBody();
    rows.forEach((row, r) => {
      const tr = body.insertRow();
      const num = document.createElement("th");
      num.scope = "row";
      num.textContent = String(r + 1);
      tr.append(num);
      row.forEach((value, c) => {
        const input = document.createElement("input");
        input.value = value;
        input.dataset.r = r;
        input.dataset.c = c;
        input.setAttribute("aria-label", `${header[c]}, row ${r + 1}`);
        if (header[c] === "Date") input.placeholder = "YYYY-MM-DD";
        input.addEventListener("input", () => { rows[r][c] = input.value; dirty = true; });
        tr.insertCell().append(input);
      });
      const actions = tr.insertCell();
      actions.className = "actions";
      actions.append(
        button("↑", `Move row ${r + 1} up`, () => r > 0 && edit(() => rows.splice(r - 1, 0, rows.splice(r, 1)[0]))),
        button("↓", `Move row ${r + 1} down`, () => r < rows.length - 1 && edit(() => rows.splice(r + 1, 0, rows.splice(r, 1)[0]))),
        button("+", `Insert a row below row ${r + 1}`, () => edit(() => rows.splice(r + 1, 0, blankRow()))),
        button("✕", `Delete row ${r + 1}`, () => confirm(`Delete row ${r + 1} (${row[0] || "empty"})?`) && edit(() => rows.splice(r, 1)), true),
      );
    });
  }

  $("add-row").addEventListener("click", () => {
    edit(() => rows.unshift(blankRow()));
    grid.querySelector("tbody tr:first-child input").focus();
  });

  // Newest first; rows without a (valid) date go last; ties keep their current order (stable sort).
  const isoDate = (v) => {
    const t = v.trim();
    if (!validDate(t)) return "";
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
    return m ? `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : t;
  };
  $("sort-rows").addEventListener("click", () => {
    const c = col("Date");
    if (c < 0) return setStatus("There is no Date column to sort by.", true);
    edit(() => rows.sort((a, b) => {
      const x = isoDate(a[c]), y = isoDate(b[c]);
      if (x === y) return 0;
      if (!x) return 1;
      if (!y) return -1;
      return x < y ? 1 : -1;
    }));
    setStatus("Sorted by date, newest first. Don't forget to save.");
  });

  const csvText = () => CSVLite.serialize([header, ...rows.filter((row) => !isBlank(row))]);

  $("download").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csvText()], { type: "text/csv;charset=utf-8" }));
    a.download = "concerts.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("save").addEventListener("click", async () => {
    const list = problems();
    showProblems(list);
    if (list.length) return setStatus("Fix the highlighted values before saving.", true);
    setStatus("Saving…");
    try {
      const r = await gh("PUT", apiUrl, {
        message: "Update concerts (admin page)", content: toBase64(csvText()), sha, branch: cfg.branch,
      });
      if (r.status === 409 || r.status === 422) {
        return setStatus("The file changed on GitHub since you loaded it. Download your CSV, reload, and redo your edits.", true);
      }
      if (!r.ok) return setStatus(`GitHub refused the save (${r.status}). The token needs write access to Contents.`, true);
      const result = await r.json();
      sha = result.content.sha;
      dirty = false;
      setStatus("Saved. The site redeploys in a minute or two.");
    } catch (err) {
      setStatus(`Could not reach GitHub: ${err.message}`, true);
    }
  });

  $("load").addEventListener("click", load);
  window.addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });
})();
