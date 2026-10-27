const MAX_CHARS = 20000;

const codeEl = document.getElementById("code");
const runEl = document.getElementById("run");
const resultEl = document.getElementById("result");
const statusEl = document.getElementById("status");
const charCountEl = document.getElementById("char-count");
const bannerEl = document.getElementById("banner");
const bannerTextEl = document.getElementById("banner-text");
const bannerCloseEl = document.getElementById("banner-close");

const EMPTY_RESULT = "Paste some code, choose an action, and hit Run — I'll review it.";

let mode = "analyze";

function setBanner(message) {
  if (!message) {
    bannerEl.classList.add("hidden");
    return;
  }
  bannerTextEl.textContent = message;
  bannerEl.classList.remove("hidden");
}

function updateCharCount() {
  charCountEl.textContent = `${codeEl.value.length} / ${MAX_CHARS}`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Minimal renderer: fenced code blocks + **bold** + `inline code`.
function renderMarkdown(text) {
  const parts = escapeHtml(text).split(/```(?:[a-z0-9+#.-]*)\n?/i);
  return parts
    .map((part, index) => {
      if (index % 2 === 1) {
        return `<pre><code>${part.replace(/\n$/, "")}</code></pre>`;
      }
      return part
        .replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    })
    .join("");
}

function setMode(nextMode, button) {
  mode = nextMode;
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip === button);
  });
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => setMode(chip.dataset.mode, chip));
});

codeEl.addEventListener("input", updateCharCount);

bannerCloseEl.addEventListener("click", () => setBanner(""));

async function run() {
  const code = codeEl.value.trim();
  if (!code) {
    codeEl.focus();
    return;
  }

  setBanner("");
  runEl.disabled = true;
  statusEl.textContent = "working…";
  resultEl.classList.remove("is-empty");
  resultEl.classList.add("is-loading");
  resultEl.textContent = "Thinking…";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, mode }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.error) {
      const message = payload.error || payload.detail || `Request failed (${response.status})`;
      setBanner(message);
      resultEl.classList.remove("is-loading");
      resultEl.classList.add("is-empty");
      resultEl.textContent = EMPTY_RESULT;
      statusEl.textContent = "failed";
      return;
    }

    resultEl.classList.remove("is-loading");
    resultEl.innerHTML = renderMarkdown(payload.result || "");
    statusEl.textContent = `${payload.mode} · ${payload.model}`;
  } catch (error) {
    setBanner(`Could not reach the server: ${error.message}`);
    resultEl.classList.remove("is-loading");
    resultEl.classList.add("is-empty");
    resultEl.textContent = EMPTY_RESULT;
    statusEl.textContent = "failed";
  } finally {
    runEl.disabled = false;
  }
}

runEl.addEventListener("click", run);

codeEl.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    run();
  }
});

updateCharCount();
