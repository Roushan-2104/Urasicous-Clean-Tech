/* Urasicous Clean Tech — shared page behaviour: menu, glossary, accordion, prototype index, entrances. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);

  // ---------- mobile menu ----------
  const navBtn = $(".nav-btn"), navMenu = $("#navMenu");
  if (navBtn && navMenu) {
    const setOpen = open => {
      navBtn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("nav-open", open);
    };
    navBtn.addEventListener("click", () => setOpen(navBtn.getAttribute("aria-expanded") !== "true"));
    navMenu.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    matchMedia("(min-width: 1181px)").addEventListener("change", e => { if (e.matches) setOpen(false); });
  }

  // ---------- glossary: tap or hover an underlined word for a plain-English meaning ----------
  const GLOSSARY = {
    kwp: "kWp (kilowatt-peak): the most power the panels can produce in full, strong sunlight.",
    peaksun: "Peak sun hours: how many hours a day the sunlight adds up to full-strength sun. Nashik gets about 5.5.",
    lfp: "LiFePO4 (lithium iron phosphate): a long-lasting battery chemistry that is much less likely to overheat or catch fire than ordinary lithium-ion.",
    mgcc: "MGCC (Microgrid Central Controller): the brain of the grid. It decides when the battery charges, when it supplies power, and when to sell power back.",
    bms: "BMS (battery management system): electronics that protect every battery cell from overcharging, overheating and draining too far.",
    dod: "Depth of discharge: how much of the battery's charge gets used. 80% means using 80% of it before charging again.",
    breakers: "MCB and ELCB: an MCB switches a circuit off if it is overloaded, and an ELCB cuts the power within milliseconds if current leaks to earth, protecting people from shocks.",
    netmeter: "Net metering: spare solar power is sold back to the main grid, and the meter counts it as earnings.",
    agri: "Agrivoltaics: using the same land for solar panels and farming at the same time.",
    kusum: "PM-KUSUM: a Government of India scheme that subsidises solar power for farmers and rural areas.",
    csr: "CSR (corporate social responsibility): money that larger companies in India must spend on social and community projects."
  };
  const terms = [...document.querySelectorAll(".term")];
  if (terms.length) {
    const tip = document.createElement("div");
    tip.className = "tip"; tip.id = "glossTip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
    document.body.appendChild(tip);
    let cur = null;
    const hide = () => { if (cur) cur.removeAttribute("aria-describedby"); cur = null; tip.hidden = true; };
    const show = t => {
      if (cur && cur !== t) cur.removeAttribute("aria-describedby");
      cur = t;
      tip.textContent = GLOSSARY[t.dataset.term] || "";
      tip.hidden = false;
      t.setAttribute("aria-describedby", tip.id);
      const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      const left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 12));
      const top = r.top - h - 10 < 76 ? r.bottom + 10 : r.top - h - 10; // flip below when it would sit under the nav
      tip.style.left = left + "px"; tip.style.top = top + "px";
    };
    terms.forEach(t => {
      t.addEventListener("mouseenter", () => show(t));
      t.addEventListener("mouseleave", hide);
      t.addEventListener("focus", () => show(t));
      t.addEventListener("blur", hide);
      t.addEventListener("click", e => { e.stopPropagation(); show(t); }); // don't also open the stage it sits in
    });
    document.addEventListener("click", hide);
    document.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
    addEventListener("scroll", hide, { passive: true });
  }

  // ---------- architecture accordion ----------
  const stages = [...document.querySelectorAll("#acc .stage")];
  const openStage = s => stages.forEach(o => o.setAttribute("aria-expanded", String(o === s)));
  stages.forEach(s => {
    s.addEventListener("click", () => openStage(s));
    s.addEventListener("keydown", e => {
      if (e.target !== s) return; // keys on a glossary word inside stay with that word
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openStage(s); }
    });
  });

  // ---------- prototype index with preview ----------
  const tabs = [...document.querySelectorAll(".idx [role=tab]")];
  if (tabs.length) {
    const box = $("#stagebox"), fact = $("#idxFact");
    const choose = t => {
      tabs.forEach(o => o.setAttribute("aria-selected", String(o === t)));
      document.querySelectorAll(".pane").forEach(p => p.classList.toggle("on", p.id === t.getAttribute("aria-controls")));
      box.dataset.tone = t.dataset.tone;
      fact.textContent = t.dataset.fact;
    };
    tabs.forEach(t => {
      t.addEventListener("click", () => choose(t));
      t.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) choose(t); });
      t.addEventListener("focus", () => choose(t));
    });
    choose(tabs[0]);
  }

  // ---------- entrances: only what is below the fold waits, and it always shows ----------
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.remove("wait"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rise").forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("wait"); io.observe(el); }
    });
    setTimeout(() => document.querySelectorAll(".rise.wait").forEach(el => el.classList.remove("wait")), 6000);
  }
})();
