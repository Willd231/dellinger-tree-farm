// Dellinger Tree Farm: site behavior
document.documentElement.classList.add("js");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Footer year ---------- */
$("#year").textContent = new Date().getFullYear();

/* ---------- Header shadow on scroll ---------- */
const header = $(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const toggle = $(".nav-toggle");
const nav = $("#site-nav");
const setMenu = (open) => {
  toggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
};
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
$$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

/* ---------- Scroll reveal ---------- */
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in-view");
    revealer.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

$$(".reveal").forEach((el) => {
  // stagger siblings slightly for a smoother cascade
  const siblings = $$(":scope > .reveal", el.parentElement);
  const i = siblings.indexOf(el);
  if (i > 0) el.style.transitionDelay = `${Math.min(i, 5) * 90}ms`;
  revealer.observe(el);
});

/* ---------- Active nav link ---------- */
const navLinks = $$('.site-nav a[href^="#"]:not(.btn)');
const sectionSpy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) sectionSpy.observe(s); });

/* ---------- Inventory ----------
   Today this reads data/inventory.json (sample data).
   Later, point INVENTORY_URL at /api/inventory once Zoho is connected;
   the API just needs to return the same JSON shape. */
const INVENTORY_URL = "data/inventory.json";
const invBody = $("#inv-body");
const invSearch = $("#inv-search");
const invCategory = $("#inv-category");
const invCount = $("#inv-count");
let inventory = [];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtPrice = (p) => (typeof p === "number" ? `$${p.toFixed(2)}` : "Call");

function renderInventory() {
  const q = invSearch.value.trim().toLowerCase();
  const cat = invCategory.value;
  const rows = inventory.filter((item) =>
    (!cat || item.category === cat) &&
    (!q || `${item.name} ${item.botanical ?? ""} ${item.category}`.toLowerCase().includes(q))
  );

  if (!rows.length) {
    invBody.innerHTML = `<tr><td colspan="5">No plants match that search. Try another word, or call us. We may have it coming in.</td></tr>`;
  } else {
    invBody.innerHTML = rows.map((item, i) => `
      <tr class="inv-row-in" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <td class="inv-name">${esc(item.name)}${item.botanical ? `<small>${esc(item.botanical)}</small>` : ""}</td>
        <td data-label="Category"><span class="tag">${esc(item.category)}</span></td>
        <td data-label="Size">${esc(item.size)}</td>
        <td data-label="Form">${esc(item.form)}</td>
        <td data-label="Price">${fmtPrice(item.price)}</td>
      </tr>`).join("");
  }
  invCount.textContent = `Showing ${rows.length} of ${inventory.length} items`;
}

async function loadInventory() {
  try {
    const res = await fetch(INVENTORY_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    inventory = data.items ?? [];
    const cats = [...new Set(inventory.map((i) => i.category))].sort();
    invCategory.insertAdjacentHTML("beforeend", cats.map((c) => `<option>${esc(c)}</option>`).join(""));
    renderInventory();
  } catch {
    invBody.innerHTML = `<tr><td colspan="5">We couldn't load the list right now. Please call <a href="tel:+18287659593">(828) 765-9593</a>.</td></tr>`;
  }
}
invSearch.addEventListener("input", renderInventory);
invCategory.addEventListener("change", renderInventory);
loadInventory();

/* ---------- Gallery lightbox (works once real <img> photos are added) ---------- */
const lightbox = document.createElement("div");
lightbox.className = "lightbox";
lightbox.setAttribute("role", "dialog");
lightbox.setAttribute("aria-modal", "true");
lightbox.innerHTML = `<button type="button">Close &times;</button><img alt="">`;
document.body.appendChild(lightbox);
const lbImg = $("img", lightbox);
const closeLb = () => lightbox.classList.remove("open");
$$(".g-item img").forEach((img) => img.addEventListener("click", () => {
  lbImg.src = img.src; lbImg.alt = img.alt; lightbox.classList.add("open"); $("button", lightbox).focus();
}));
lightbox.addEventListener("click", (e) => { if (e.target !== lbImg) closeLb(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

/* ---------- Contact form ---------- */
const form = $("#contact-form");
const status = $("#form-status");
const EMAIL = "dellingertreefarm@gmail.com";

function setStatus(msg, kind) {
  status.innerHTML = msg;
  status.className = `form-status ${kind ?? ""}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let firstBad = null;
  $$("[required]", form).forEach((el) => {
    const bad = !el.checkValidity();
    el.closest(".field").classList.toggle("invalid", bad);
    if (bad && !firstBad) firstBad = el;
  });
  if (firstBad) {
    setStatus("Please fill in the highlighted fields.", "err");
    firstBad.focus();
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const btn = $("button[type=submit]", form);
  btn.disabled = true;
  btn.textContent = "Sending…";

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    setStatus("Thank you! We got your request and will be in touch soon.", "ok");
  } catch {
    // Until the form backend is connected, fall back to the visitor's email app.
    const body = `Name: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nReason: ${data.reason}\n\n${data.message}`;
    const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent("Website inquiry: " + data.reason)}&body=${encodeURIComponent(body)}`;
    setStatus(`We couldn't send that automatically. <a href="${mailto}">Click here to email it to us</a>, or call <a href="tel:+18287659593">(828) 765-9593</a>.`, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Request";
  }
});
$$("[required]", form).forEach((el) =>
  el.addEventListener("input", () => el.closest(".field").classList.remove("invalid"))
);
