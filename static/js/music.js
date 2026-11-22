(() => {
  const tracks = JSON.parse(document.getElementById("playlist-data").textContent);
  const frame = document.getElementById("music-frame");
  const label = document.getElementById("music-label");
  const marquee = document.getElementById("music-marquee");
  const shuffle = document.getElementById("music-shuffle");
  if (!tracks.length) return;

  const KEY = "music:last-track";
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked: fine */ } };
  const theme = () =>
    document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  // Random track, never the same one twice in a row (also across refreshes and visits).
  function pick() {
    const last = read();
    let track;
    do {
      track = tracks[Math.floor(Math.random() * tracks.length)];
    } while (tracks.length > 1 && String(track.id) === last);
    write(String(track.id));
    return track;
  }

  function show(track) {
    // No autoplay parameter and no "autoplay" permission on the iframe: the visitor presses play.
    frame.src = `https://widget.deezer.com/widget/${theme()}/track/${track.id}`;
    label.textContent = `${track.title} – ${track.artist}`;
  }

  // Title too long for the card: slide it back and forth so it can be read in full.
  const SPEED = 35; // px per second
  function fitLabel() {
    const overflow = Math.ceil(label.scrollWidth - marquee.clientWidth);
    marquee.title = label.textContent;
    label.classList.toggle("scrolling", overflow > 0);
    if (overflow > 0) {
      label.style.setProperty("--shift", `-${overflow}px`);
      label.style.setProperty("--duration", `${Math.max(4, overflow / SPEED + 2)}s`);
    }
  }
  new ResizeObserver(fitLabel).observe(label);
  new ResizeObserver(fitLabel).observe(marquee);

  shuffle.hidden = false;
  shuffle.addEventListener("click", () => show(pick()));
  show(pick());
})();
