(() => {
  const groups = JSON.parse(document.getElementById("concert-data").textContent);
  const table = document.getElementById("concert-table");
  const tbody = table.tBodies[0];
  const search = document.getElementById("concert-search");
  const yearSel = document.getElementById("concert-year");
  const stats = document.getElementById("concert-stats");
  const charts = document.getElementById("concert-charts");
  const empty = document.getElementById("concert-empty");
  document.querySelector("[data-js]").hidden = false;

  const yearOf = (c) => c.date.slice(0, 4);
  const venueOf = (c) => [c.venue, c.city].filter(Boolean).join(", ");
  const years = [...new Set(groups.flatMap((g) => g.concerts.map(yearOf)).filter(Boolean))].sort();
  if (years.length) years.forEach((y) => yearSel.add(new Option(y, y)));
  else yearSel.closest("label").hidden = true;

  let sortKey = "order";
  let sortDir = 1;
  const expanded = new Set();

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const cell = (text, cls) => el("td", cls, text);
  const price = (c) => (c.price === null ? "—" : `${c.price.toFixed(2)} €`);

  const stat = (label, value) => {
    const d = el("div", "stat");
    d.append(el("strong", "", value), el("span", "", label));
    return d;
  };

  const bars = (title, entries) => {
    const box = el("section", "chart");
    box.append(el("h2", "", title));
    const max = Math.max(...entries.map((e) => e[1]));
    entries.forEach(([label, value]) => {
      const row = el("div", "bar-row");
      const bar = el("div", "bar");
      bar.style.width = `${(value / max) * 100}%`;
      row.append(el("span", "bar-label", label), bar, el("span", "bar-value", String(value)));
      box.append(row);
    });
    return box;
  };

  // The groups that pass the filters, each with the concerts that match the year filter.
  function visibleGroups() {
    const q = search.value.trim().toLowerCase();
    const year = yearSel.value;
    return groups
      .map((g) => {
        const concerts = year ? g.concerts.filter((c) => yearOf(c) === year) : g.concerts;
        const undocumented = year ? 0 : g.undocumented;
        return { ...g, concerts, undocumented, shows: concerts.length + undocumented };
      })
      .filter((g) => g.concerts.length > 0)
      .filter((g) => !q || `${g.artist} ${g.concerts.map(venueOf).join(" ")}`.toLowerCase().includes(q));
  }

  function sortValue(g, key) {
    const latest = g.concerts[0];
    return { artist: g.artist, date: latest.date, venue: venueOf(latest), price: latest.price,
             total: g.shows, order: g.order }[key];
  }

  function compare(a, b) {
    const x = sortValue(a, sortKey), y = sortValue(b, sortKey);
    const blankX = x === "" || x === null, blankY = y === "" || y === null;
    if (blankX || blankY) return blankX === blankY ? a.order - b.order : blankX ? 1 : -1;
    const r = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "en", { sensitivity: "base" });
    return r * sortDir || a.order - b.order;
  }

  function renderRows(visible) {
    tbody.replaceChildren();
    visible.forEach((g) => {
      const [latest, ...others] = g.concerts;
      const hasMore = others.length > 0 || g.undocumented > 0;
      const open = expanded.has(g.order);
      const head = el("th");
      head.scope = "row";
      if (hasMore) {
        const btn = el("button", "toggle", g.artist);
        btn.type = "button";
        btn.setAttribute("aria-expanded", String(open));
        btn.title = "Show the other concerts";
        btn.addEventListener("click", () => {
          if (expanded.has(g.order)) expanded.delete(g.order); else expanded.add(g.order);
          update();
        });
        head.append(btn);
      } else {
        head.textContent = g.artist;
      }
      const tr = el("tr", "main");
      tr.append(head, cell(latest.date || "—"), cell(venueOf(latest) || "—"), cell(price(latest), "num"), cell(String(g.shows), "num"));
      tbody.append(tr);
      if (!hasMore || !open) return;
      others.forEach((c) => {
        const sub = el("tr", "sub");
        sub.append(el("th", "", "Earlier"), cell(c.date || "—"), cell(venueOf(c) || "—"), cell(price(c), "num"), cell(""));
        sub.firstChild.scope = "row";
        tbody.append(sub);
      });
      if (g.undocumented > 0) {
        const sub = el("tr", "sub");
        const note = cell(`${g.undocumented} more concert${g.undocumented > 1 ? "s" : ""} without details`);
        note.colSpan = 4;
        sub.append(el("th", "", "Earlier"), note);
        sub.firstChild.scope = "row";
        tbody.append(sub);
      }
    });
  }

  const tally = (items, keyFn) => {
    const m = new Map();
    items.forEach(([key, n]) => {
      const k = keyFn(key);
      if (k) m.set(k, (m.get(k) || 0) + n);
    });
    return [...m.entries()];
  };

  function renderStats(visible) {
    stats.replaceChildren();
    charts.replaceChildren();
    if (!visible.length) {
      stats.hidden = charts.hidden = true;
      return;
    }
    const all = visible.flatMap((g) => g.concerts);
    stats.append(stat("concerts", visible.reduce((s, g) => s + g.shows, 0)), stat("artists", visible.length));
    const priced = all.filter((c) => c.price !== null);
    if (priced.length) {
      const spent = priced.reduce((s, c) => s + c.price, 0);
      stats.append(stat("spent on listed tickets", `${spent.toFixed(2)} €`),
                   stat("average ticket", `${(spent / priced.length).toFixed(2)} €`));
    }
    stats.hidden = false;
    const top = visible.map((g) => [g.artist, g.shows]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (top[0][1] > 1) charts.append(bars("Most seen artists", top));
    const perYear = tally(all.map((c) => [c, 1]), yearOf).sort();
    if (perYear.length) charts.append(bars("Concerts per year", perYear));
    charts.hidden = !charts.children.length;
  }

  function update() {
    const visible = visibleGroups().sort(compare);
    renderRows(visible);
    renderStats(visible);
    empty.hidden = visible.length > 0;
    table.querySelectorAll("th[data-sort]").forEach((th) => {
      th.setAttribute("aria-sort", th.dataset.sort === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none");
    });
  }

  table.querySelectorAll("th[data-sort]").forEach((th) => {
    th.tabIndex = 0;
    const toggle = () => {
      const key = th.dataset.sort;
      if (key === sortKey) sortDir = -sortDir;
      else { sortKey = key; sortDir = 1; }
      update();
    };
    th.addEventListener("click", toggle);
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
  search.addEventListener("input", update);
  yearSel.addEventListener("change", update);
  update();
})();
