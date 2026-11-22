(() => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");
  const submit = form.querySelector("button[type=submit]");

  const say = (msg, isError = false) => {
    status.textContent = msg;
    status.className = isError ? "error" : "ok";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.elements._gotcha.value) return; // a bot filled the hidden field
    submit.disabled = true;
    say("Sending…");
    try {
      const r = await fetch(form.action, {
        method: "POST", body: new FormData(form), headers: { Accept: "application/json" },
      });
      if (r.ok) {
        form.reset();
        say("Thanks! Your message has been sent, I'll get back to you soon.");
      } else {
        const body = await r.json().catch(() => ({}));
        const detail = (body.errors || []).map((x) => x.message).join(" ");
        say(detail || "Something went wrong. Please try again, or contact me on LinkedIn.", true);
      }
    } catch {
      say("Could not send the message (network problem). Please try again, or contact me on LinkedIn.", true);
    } finally {
      submit.disabled = false;
    }
  });
})();
