/* ROM Cat · yellow pages of producers → ROMs */

(function () {
  const kicker = document.getElementById("kicker");
  const foot = document.getElementById("foot");
  const viewProducers = document.getElementById("viewProducers");
  const viewProducer = document.getElementById("viewProducer");
  const producerShelf = document.getElementById("producerShelf");
  const producerCard = document.getElementById("producerCard");
  const romBins = document.getElementById("romBins");
  const viewRom = document.getElementById("viewRom");
  const romPage = document.getElementById("romPage");

  const dlgP = document.getElementById("dlgProducer");
  const dlgR = document.getElementById("dlgRom");
  const formP = document.getElementById("formProducer");
  const formR = document.getElementById("formRom");

  let data = null;
  let openProducerId = null;
  let openRomId = null;
  let returnToRomAfterEdit = null;
  const NAV_LS = "romcat.nav.v1";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Short plate fragment from chip (same idea as Launcher plate_from_chip). */
  function shortPlate(chip, name) {
    const c = String(chip || "").trim();
    if (!c) return String(name || "ROM").slice(0, 8).toUpperCase();
    const parts = c.replace(/\./g, "-").split("-").filter(Boolean);
    if (!parts.length) return c.slice(0, 10).toUpperCase();
    let tail = parts[parts.length - 1];
    if (tail.length <= 2 && parts.length >= 2) tail = parts.slice(-2).join("-");
    else if (/^\d+$/.test(tail) && parts.length >= 2) tail = parts.slice(-2).join("-");
    else if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 2])) {
      tail = parts[parts.length - 2] + "-" + parts[parts.length - 1];
    }
    return String(tail).slice(0, 14).toUpperCase();
  }

  function romsFor(pid) {
    return (data.roms || []).filter((r) => r.producer_id === pid);
  }

  function producerById(pid) {
    return (data.producers || []).find((p) => p.id === pid) || null;
  }

  /** Remember place in catalog so refresh / hard reload doesn't dump you on home. */
  function writeNav(pid) {
    const id = pid || "";
    try {
      if (id) {
        localStorage.setItem(NAV_LS, JSON.stringify({ producer_id: id, t: Date.now() }));
      } else {
        localStorage.removeItem(NAV_LS);
      }
    } catch (e) {
      /* */
    }
    try {
      const u = new URL(window.location.href);
      if (id) {
        u.searchParams.set("p", id);
        const hash = "#p=" + encodeURIComponent(id);
        if (window.location.hash !== hash || u.searchParams.get("p") !== id) {
          history.replaceState(null, "", u.pathname + u.search + hash);
        }
      } else {
        u.searchParams.delete("p");
        const base = u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "");
        if (window.location.hash || u.searchParams.has("p")) {
          history.replaceState(null, "", base);
        }
      }
    } catch (e) {
      /* */
    }
  }

  function readNavProducerId() {
    try {
      const u = new URL(window.location.href);
      const q = (u.searchParams.get("p") || "").trim();
      if (q) return q;
      const h = (window.location.hash || "").replace(/^#/, "");
      if (h.startsWith("p=")) return decodeURIComponent(h.slice(2)).trim();
      // #producer/id style
      const m = h.match(/^producer\/(.+)$/i);
      if (m) return decodeURIComponent(m[1]).trim();
    } catch (e) {
      /* */
    }
    try {
      const raw = localStorage.getItem(NAV_LS);
      if (!raw) return "";
      const j = JSON.parse(raw);
      return (j && j.producer_id) || "";
    } catch (e) {
      return "";
    }
  }

  function setKicker() {
    const nP = (data.producers || []).length;
    const nR = (data.roms || []).length;
    const whisper = data.whisper || "the catalog that files the makers · and the makers' ROMs";
    if (kicker) kicker.textContent = whisper;
    const stats = document.getElementById("railStats");
    if (stats) {
      stats.innerHTML =
        `<span class="rc-rail-pip">${nP}</span> producer${nP === 1 ? "" : "s"}` +
        `<span class="rc-rail-dot">·</span>` +
        `<span class="rc-rail-pip">${nR}</span> ROM${nR === 1 ? "" : "s"}`;
    }
    const self = (data.roms || []).some(
      (r) => r.chip_code === "CO.DCC-001-ROMCAT" || r.id === "romcat"
    );
    foot.textContent = self
      ? "Dewey Catalog Co. · braid intact · ROM Cat is filed under CO.DCC"
      : "Dewey Catalog Co. · WARNING · file ROM Cat on its own shelf or the braid frays";
  }

  function showProducers() {
    openProducerId = null;
    writeNav("");
    viewProducers.hidden = false;
    viewProducer.hidden = true;
    if (viewRom) viewRom.hidden = true;
    openRomId = null;
    const list = data.producers || [];
    if (!list.length) {
      producerShelf.innerHTML =
        '<li class="rc-empty">No producers on file. Add one when a maker exists.</li>';
      return;
    }
    producerShelf.innerHTML = list
      .map((p, i) => {
        const n = romsFor(p.id).length;
        const hue = i % 5;
        return (
          `<li>` +
          `<button type="button" class="rc-shelf-item rc-producer-tile hue-${hue}" data-open="${esc(p.id)}">` +
          `<span class="rc-tile-tab" aria-hidden="true"></span>` +
          `<span class="rc-shelf-name">${esc(p.name)}</span>` +
          `<span class="rc-shelf-chip">${esc(p.chip_code || "—")}</span>` +
          `<p class="rc-shelf-meta">${esc(
            (p.mission || "").slice(0, 72) || "no mission filed yet"
          )}${p.mission && p.mission.length > 72 ? "…" : ""}</p>` +
          `<span class="rc-shelf-count"><span class="rc-count-pip">${n}</span> ROM${
            n === 1 ? "" : "s"
          }</span>` +
          `</button></li>`
        );
      })
      .join("");

    producerShelf.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openProducer(btn.getAttribute("data-open")));
    });
  }

  function openProducer(pid) {
    const p = producerById(pid);
    if (!p) return;
    openProducerId = pid;
    writeNav(pid);
    viewProducers.hidden = true;
    viewProducer.hidden = false;
    if (viewRom) viewRom.hidden = true;
    openRomId = null;

    // Compact bay strip — room for ROM cart faces, not a huge empty card
    producerCard.className = "rc-bay-strip rc-pp-head";
    viewProducer.style.setProperty("--hue", producerHue(pid));
    producerCard.innerHTML = producerHeaderHtml(p, romsFor(pid).length);
    document.getElementById("btnEditProducer").onclick = () => openProducerForm(p);
    document.getElementById("btnBackInner").onclick = () => showProducers();

    const roms = romsFor(pid);
    if (!roms.length) {
      romBins.className = "rc-shelf rc-rom-shelf";
      romBins.innerHTML =
        '<li class="rc-empty">No ROMs on this shelf yet. Incomplete is allowed. Stock a cart.</li>';
      return;
    }
    // IDA03: product boxes with real cart face (not text cards / not producer twins)
    romBins.className = "rc-shelf rc-rom-shelf";
    romBins.innerHTML = roms
      .map((r) => {
        const shell = r.case_shell === "julie" ? "julie" : "classicboi";
        const tint = String(r.julie_tint || "red").trim();
        const hex = isJulieHex(tint);
        const shellCls =
          "rc-plate-preview-cart rc-rom-face shell-" +
          shell +
          (shell === "julie" ? (hex ? " tint-custom" : " tint-" + tint.replace(/[^a-z0-9_-]/gi, "")) : "");
        const onShelf = r.launcher_show !== false;
        return (
          `<li class="rc-rom-slot">` +
          `<button type="button" class="rc-rom-product" data-view-rom="${esc(r.id)}" title="${esc(
            r.name || "ROM"
          )}">` +
          `<span class="rc-rom-peg" aria-hidden="true"></span>` +
          `<span class="${shellCls}" ${hex ? `style="--julie:${esc(tint)}"` : ""}>` +
          `<span class="rc-prev-shell"></span>` +
          `<span class="rc-prev-notch" aria-hidden="true"></span>` +
          `<span class="rc-prev-well" aria-hidden="true"></span>` +
          `<span class="rc-prev-badge">${esc(shortPlate(r.chip_code, r.name))}</span>` +
          `<span class="rc-plate-preview-plate rc-rom-face-plate" data-rom-plate="${esc(
            r.id
          )}"></span>` +
          `<span class="rc-prev-sku">${esc(
            (r.chip_code || "CO.SKU").slice(0, 20)
          )}</span>` +
          `<span class="rc-prev-shutter" aria-hidden="true"></span>` +
          `<span class="rc-prev-pins" aria-hidden="true"></span>` +
          `</span>` +
          `<span class="rc-rom-product-foot">` +
          `<span class="rc-status" data-s="${esc(r.status || "idea")}">${esc(
            r.status || "idea"
          )}</span>` +
          `<span class="rc-rom-product-name">${esc(r.name || "unnamed")}</span>` +
          `<span class="rc-rom-product-sub">${esc(shell)}${
            shell === "julie" ? " · " + esc(tint) : ""
          } · ${onShelf ? "LAUNCHER" : "STOCKROOM"}</span>` +
          `</span>` +
          `</button>` +
          `<div class="rc-rom-card-actions">` +
          `<button type="button" class="rc-btn" data-edit-rom="${esc(r.id)}">edit</button>` +
          `<button type="button" class="rc-btn" data-toggle-launch="${esc(r.id)}">${
            onShelf ? "hide" : "show"
          }</button>` +
          `</div></li>`
        );
      })
      .join("");

    // apply plate CSS + name after paint (style not string-escaped into HTML)
    roms.forEach((r) => {
      const plate = romBins.querySelector(`[data-rom-plate="${CSS.escape(r.id)}"]`);
      if (!plate) return;
      plate.textContent = r.name || "ROM";
      const raw = (r.plate_css || "").trim();
      if (raw) plate.setAttribute("style", raw);
      plate.classList.toggle("has-custom-plate", !!raw);
    });

    romBins.querySelectorAll("[data-edit-rom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = (data.roms || []).find(
          (x) => x.id === btn.getAttribute("data-edit-rom")
        );
        if (r) openRomForm(r);
      });
    });
    romBins.querySelectorAll("[data-view-rom]").forEach((btn) => {
      btn.addEventListener("click", () => showRom(btn.getAttribute("data-view-rom")));
    });
    romBins.querySelectorAll("[data-toggle-launch]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-toggle-launch");
        const r = (data.roms || []).find((x) => x.id === id);
        if (!r) return;
        const next = r.launcher_show === false;
        try {
          await post("/api/rom", {
            action: "upsert",
            id: r.id,
            producer_id: r.producer_id,
            name: r.name,
            chip_code: r.chip_code,
            description: r.description,
            status: r.status,
            address: r.address,
            notes: r.notes,
            launcher_show: next,
            plate_css: r.plate_css || "",
            case_shell: r.case_shell === "julie" ? "julie" : "classicboi",
            julie_tint: r.julie_tint || "red",
          });
          if (openProducerId) openProducer(openProducerId);
        } catch (ex) {
          alert(ex.message);
        }
      });
    });
  }

  /* ── ROM page + producer header (viewing layer) ───────────
     A ROM opens as a readable page. Edit is a secondary action that
     opens the SAME editor dialog (openRomForm) — customization untouched. */
  const ROM_LABELS = {
    name: "ROM name",
    description: "Description",
    producer_id: "Producer",
    chip_code: "ROM chip code (SKU)",
    status: "Release status",
    address: "Address in ALICE_BOX",
    launcher_show: "Show on ROM Launcher",
    case_shell: "Case shell",
    julie_tint: "Julie tint",
    plate_css: "Logo plate CSS",
    notes: "Free notes",
    id: "Catalog ID",
  };
  const ROM_SECTIONS = [
    { title: "About", keys: ["description", "notes"], wide: true },
    { title: "Catalog card", keys: ["producer_id", "chip_code", "status", "address", "launcher_show", "id"] },
    { title: "Case & plate", keys: ["case_shell", "julie_tint", "plate_css"] },
  ];
  const ROM_KNOWN = ["name"].concat(...ROM_SECTIONS.map((s) => s.keys));
  const PRODUCER_LABELS = {
    name: "Company name",
    chip_code: "Company chip code",
    mission: "Mission statement",
    hands_ven: "Current hands operator (VEN)",
    address: "Address in ALICE_BOX",
    notes: "Free notes",
    id: "Catalog ID",
  };
  const PRODUCER_KNOWN = ["id", "name", "chip_code", "mission", "hands_ven", "address", "notes"];
  // display-only copy of the swatch colours used by the editor buttons
  const TINT_SWATCH = {
    red: "#c01830",
    crimson: "#7a0018",
    pink: "#d02878",
    purple: "#5a18b8",
    blue: "#1858c8",
    mint: "#189878",
    amber: "#c87810",
    clear: "#6a90b0",
    smoke: "#4a5058",
  };
  // same five tab colours as the producer tiles on the first page
  const HUES = ["#5c6ee8", "#e85a9a", "#3cb89a", "#e8a040", "#8a62d8"];

  function producerHue(pid) {
    const i = (data.producers || []).findIndex((p) => p.id === pid);
    return HUES[(i < 0 ? 0 : i) % HUES.length];
  }

  function romById(rid) {
    return (data.roms || []).find((r) => r.id === rid) || null;
  }

  function readNavRomId() {
    try {
      const h = (window.location.hash || "").replace(/^#/, "");
      if (h.startsWith("r=")) return decodeURIComponent(h.slice(2)).trim();
    } catch (e) {
      /* */
    }
    return "";
  }

  function humanKey(k) {
    const s = String(k)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_\-.]+/g, " ")
      .trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : String(k);
  }

  function emptyVal(txt) {
    return `<span class="rc-empty-val">${esc(txt || "nothing filed")}</span>`;
  }

  function monoOr(v, empty) {
    return String(v ?? "").trim() ? `<span class="rc-mono">${esc(v)}</span>` : emptyVal(empty || "blank");
  }

  /** Any stored value → readable HTML (prose keeps line breaks, lists as lists). */
  function valueHtml(v) {
    if (v === null || v === undefined) return emptyVal("nothing filed");
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "number") return esc(String(v));
    if (Array.isArray(v)) {
      if (!v.length) return emptyVal("empty list");
      return `<ul class="rc-list">${v.map((x) => `<li>${valueHtml(x)}</li>`).join("")}</ul>`;
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      if (!keys.length) return emptyVal("empty");
      return listHtml(v, keys, {}, null, true);
    }
    const s = String(v);
    if (!s.trim()) return emptyVal("blank");
    return `<div class="rc-prose">${esc(s)}</div>`;
  }

  /** Label / value rows for the given keys (missing keys say "not set"). */
  function listHtml(obj, keys, labels, special, nested) {
    const has = (k) => Object.prototype.hasOwnProperty.call(obj, k);
    return (
      `<dl class="rc-fields${nested ? " rc-fields-nested" : ""}">` +
      keys
        .map((k) => {
          const custom = special ? special(k, obj[k], has(k)) : null;
          const body = custom != null ? custom : has(k) ? valueHtml(obj[k]) : emptyVal("not set");
          return (
            `<div class="rc-field"><dt>${esc(labels[k] || humanKey(k))}</dt>` +
            `<dd data-field="${esc(k)}">${body}</dd></div>`
          );
        })
        .join("") +
      `</dl>`
    );
  }

  /** Producer page header: breadcrumbs + readable card with every producer field. */
  function producerHeaderHtml(p, nRoms) {
    const extras = Object.keys(p).filter((k) => !PRODUCER_KNOWN.includes(k));
    const fact = (label, html) => `<div class="rc-fact"><dt>${esc(label)}</dt><dd>${html}</dd></div>`;
    return (
      `<nav class="rc-crumbs" aria-label="Breadcrumb">` +
      `<button type="button" class="rc-crumb" id="btnBackInner">Producers</button>` +
      `<span class="rc-crumb-sep" aria-hidden="true">›</span>` +
      `<span class="rc-crumb-here" aria-current="page">${esc(p.name || p.id)}</span>` +
      `</nav>` +
      `<div class="rc-pp-card">` +
      `<div class="rc-pp-top">` +
      `<div class="rc-pp-titles">` +
      `<p class="rc-kick">Producer${
        String(p.chip_code || "").trim() ? ` · <span class="rc-kick-chip">${esc(p.chip_code)}</span>` : ""
      }</p>` +
      `<h1 class="rc-pp-name">${esc(p.name || p.id)}</h1>` +
      `</div>` +
      `<button type="button" class="rc-btn" id="btnEditProducer">Edit producer</button>` +
      `</div>` +
      (String(p.mission || "").trim()
        ? `<p class="rc-pp-mission rc-prose">${esc(p.mission)}</p>`
        : `<p class="rc-pp-mission">${emptyVal("no mission statement filed")}</p>`) +
      `<dl class="rc-facts">` +
      fact(PRODUCER_LABELS.chip_code, monoOr(p.chip_code)) +
      fact(PRODUCER_LABELS.hands_ven, monoOr(p.hands_ven)) +
      fact(PRODUCER_LABELS.address, monoOr(p.address)) +
      fact("ROMs on file", `<span class="rc-mono">${nRoms}</span>`) +
      fact(PRODUCER_LABELS.id, monoOr(p.id)) +
      `</dl>` +
      `<div class="rc-pp-notes"><h3 class="rc-sub-h">${esc(PRODUCER_LABELS.notes)}</h3>${
        Object.prototype.hasOwnProperty.call(p, "notes") ? valueHtml(p.notes) : emptyVal("not set")
      }</div>` +
      (extras.length
        ? `<div class="rc-pp-extra"><h3 class="rc-sub-h">Other fields</h3>${listHtml(p, extras, {}, null)}</div>`
        : "") +
      `</div>`
    );
  }

  /** Same case markup the shelf cards use (shell / tint / plate_css). */
  function romFaceHtml(r) {
    const shell = r.case_shell === "julie" ? "julie" : "classicboi";
    const tint = String(r.julie_tint || "red").trim();
    const hex = isJulieHex(tint);
    const cls =
      "rc-plate-preview-cart rc-rom-face shell-" +
      shell +
      (shell === "julie" ? (hex ? " tint-custom" : " tint-" + tint.replace(/[^a-z0-9_-]/gi, "")) : "");
    return (
      `<span class="${cls}" ${hex ? `style="--julie:${esc(tint)}"` : ""}>` +
      `<span class="rc-prev-shell"></span>` +
      `<span class="rc-prev-notch" aria-hidden="true"></span>` +
      `<span class="rc-prev-well" aria-hidden="true"></span>` +
      `<span class="rc-prev-badge">${esc(shortPlate(r.chip_code, r.name))}</span>` +
      `<span class="rc-plate-preview-plate rc-rom-face-plate" data-rp-plate></span>` +
      `<span class="rc-prev-sku">${esc((r.chip_code || "CO.SKU").slice(0, 20))}</span>` +
      `<span class="rc-prev-shutter" aria-hidden="true"></span>` +
      `<span class="rc-prev-pins" aria-hidden="true"></span>` +
      `</span>`
    );
  }

  function showRom(rid) {
    const r = romById(rid);
    if (!r || !viewRom || !romPage) return;
    const p = producerById(r.producer_id);
    openProducerId = r.producer_id || null;
    openRomId = r.id;
    writeNav(r.producer_id || "");
    try {
      const u = new URL(window.location.href);
      history.replaceState(null, "", u.pathname + u.search + "#r=" + encodeURIComponent(r.id));
    } catch (e) {
      /* */
    }
    viewProducers.hidden = true;
    viewProducer.hidden = true;
    viewRom.hidden = false;
    viewRom.style.setProperty("--hue", producerHue(r.producer_id));

    const shell = r.case_shell === "julie" ? "julie" : "classicboi";
    const tint = String(r.julie_tint || "red").trim();
    const onShelf = r.launcher_show !== false;
    const backBtn = p
      ? `<button type="button" class="rc-btn" data-go-producer="${esc(p.id)}">← Back to ${esc(p.name)}</button>`
      : `<button type="button" class="rc-btn" data-crumb-home>← Producers</button>`;

    const special = (k, v, has) => {
      if (k === "producer_id") {
        if (!has || !String(v ?? "").trim()) return emptyVal("no producer set");
        return p
          ? `<button type="button" class="rc-crumb" data-go-producer="${esc(p.id)}">${esc(p.name)}</button>` +
              ` <span class="rc-mono rc-note">${esc(v)}</span>`
          : `<span class="rc-mono">${esc(v)}</span> <span class="rc-note">(no producer on file with this id)</span>`;
      }
      if (!has) {
        if (k === "case_shell") return emptyVal("not set · shows as classicboi");
        if (k === "julie_tint") return emptyVal("not set · julie shells default to red");
        if (k === "plate_css") return emptyVal("not set · classic plate");
        return null;
      }
      if ((k === "chip_code" || k === "address" || k === "id") && String(v ?? "").trim()) {
        return `<span class="rc-mono">${esc(v)}</span>`;
      }
      if (k === "status" && String(v ?? "").trim()) {
        return `<span class="rc-status" data-s="${esc(v)}">${esc(v)}</span>`;
      }
      if (k === "launcher_show" && typeof v === "boolean") {
        return v ? "Yes · on the ROM Launcher start menu" : "No · kept in the stockroom";
      }
      if (k === "case_shell" && String(v ?? "").trim()) {
        return `<span class="rc-mono">${esc(v)}</span>`;
      }
      if (k === "julie_tint" && String(v ?? "").trim()) {
        const t = String(v).trim();
        const sw = TINT_SWATCH[t.toLowerCase()] || (isJulieHex(t) ? t : "");
        return (
          (sw ? `<span class="rc-swatch" style="--sw:${esc(sw)}"></span>` : "") +
          `<span class="rc-mono">${esc(t)}</span>` +
          (shell !== "julie" ? ` <span class="rc-note">· only used by the julie shell</span>` : "")
        );
      }
      if (k === "plate_css" && String(v ?? "").trim()) {
        return `<pre class="rc-code">${esc(v)}</pre>`;
      }
      return null;
    };

    const extras = Object.keys(r).filter((k) => !ROM_KNOWN.includes(k));
    const sections = ROM_SECTIONS.concat(extras.length ? [{ title: "Other fields", keys: extras, wide: true }] : []);

    romPage.innerHTML =
      `<nav class="rc-crumbs" aria-label="Breadcrumb">` +
      `<button type="button" class="rc-crumb" data-crumb-home>Producers</button>` +
      `<span class="rc-crumb-sep" aria-hidden="true">›</span>` +
      (p
        ? `<button type="button" class="rc-crumb" data-go-producer="${esc(p.id)}">${esc(p.name)}</button>`
        : `<span class="rc-crumb-here">${esc(r.producer_id || "no producer")}</span>`) +
      `<span class="rc-crumb-sep" aria-hidden="true">›</span>` +
      `<span class="rc-crumb-here" aria-current="page">${esc(r.name || "unnamed ROM")}</span>` +
      `</nav>` +
      `<header class="rc-rp-head">` +
      `<div class="rc-rp-face">${romFaceHtml(r)}</div>` +
      `<div class="rc-rp-title">` +
      `<p class="rc-kick">ROM${p ? ` · <span class="rc-kick-chip">${esc(p.name)}</span>` : ""}</p>` +
      `<h1 class="rc-rp-name">${esc(r.name || "unnamed ROM")}</h1>` +
      `<div class="rc-rp-tags">` +
      `<span class="rc-status" data-s="${esc(r.status || "idea")}">${esc(r.status || "idea")}</span>` +
      (r.chip_code ? `<span class="rc-rp-sku">${esc(r.chip_code)}</span>` : "") +
      `<span class="rc-rp-tag">${esc(shell)}${shell === "julie" ? " · " + esc(tint) : ""}</span>` +
      `<span class="rc-rp-tag${onShelf ? " is-on" : ""}">${onShelf ? "on launcher" : "stockroom"}</span>` +
      `</div>` +
      `<div class="rc-rp-actions">` +
      `<button type="button" class="rc-btn rc-btn-primary" data-rp-edit>Edit ROM</button>` +
      backBtn +
      `</div>` +
      `</div>` +
      `</header>` +
      `<div class="rc-rp-sections">` +
      sections
        .map(
          (s) =>
            `<section class="rc-rp-sec${s.wide ? " rc-rp-sec-wide" : ""}" aria-label="${esc(s.title)}">` +
            `<h2 class="rc-rp-sec-h">${esc(s.title)}</h2>` +
            listHtml(r, s.keys, ROM_LABELS, special) +
            `</section>`
        )
        .join("") +
      `</div>`;

    // plate CSS + name after paint (same as shelf cards)
    const plate = romPage.querySelector("[data-rp-plate]");
    if (plate) {
      plate.textContent = r.name || "ROM";
      const raw = (r.plate_css || "").trim();
      if (raw) plate.setAttribute("style", raw);
      plate.classList.toggle("has-custom-plate", !!raw);
    }

    romPage.querySelectorAll("[data-crumb-home]").forEach((b) => {
      b.addEventListener("click", () => showProducers());
    });
    romPage.querySelectorAll("[data-go-producer]").forEach((b) => {
      b.addEventListener("click", () => openProducer(b.getAttribute("data-go-producer")));
    });
    const editBtn = romPage.querySelector("[data-rp-edit]");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const cur = romById(r.id);
        if (!cur) return;
        returnToRomAfterEdit = cur.id;
        openRomForm(cur);
      });
    }
    const main = document.querySelector(".rc-main");
    if (main) main.scrollTop = 0;
  }

  function openProducerForm(p) {
    document.getElementById("dlgProducerTitle").textContent = p
      ? "Edit producer"
      : "New producer";
    document.getElementById("p_id").value = p ? p.id : "";
    document.getElementById("p_name").value = p ? p.name || "" : "";
    document.getElementById("p_chip").value = p ? p.chip_code || "" : "";
    document.getElementById("p_mission").value = p ? p.mission || "" : "";
    document.getElementById("p_hands").value = p ? p.hands_ven || "" : "";
    document.getElementById("p_address").value = p ? p.address || "" : "";
    document.getElementById("p_notes").value = p ? p.notes || "" : "";
    document.getElementById("p_delete").hidden = !p;
    document.getElementById("p_err").hidden = true;
    showEditor(dlgP);
  }

  function getCaseShell() {
    return (document.getElementById("r_case_shell") || {}).value || "classicboi";
  }

  const JULIE_PRESETS = [
    "red",
    "crimson",
    "pink",
    "purple",
    "mint",
    "clear",
    "blue",
    "amber",
    "smoke",
  ];

  function isJulieHex(t) {
    const s = String(t || "").trim().toLowerCase();
    return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s);
  }

  function getJulieTint() {
    return (document.getElementById("r_julie_tint") || {}).value || "red";
  }

  function setCaseShell(shell) {
    shell = shell === "julie" ? "julie" : "classicboi";
    const hid = document.getElementById("r_case_shell");
    if (hid) hid.value = shell;
    document.querySelectorAll(".rc-shell-btn").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-shell") === shell);
    });
    const tintRow = document.getElementById("r_julie_tint_row");
    if (tintRow) tintRow.hidden = shell !== "julie";
    updatePlatePreview();
  }

  function setJulieTint(tint) {
    let t = String(tint || "red").trim().toLowerCase();
    if (!JULIE_PRESETS.includes(t) && !isJulieHex(t)) t = "red";
    const hid = document.getElementById("r_julie_tint");
    if (hid) hid.value = t;
    document.querySelectorAll(".rc-tint-swatch").forEach((b) => {
      b.classList.toggle("is-on", b.getAttribute("data-tint") === t);
    });
    const hexIn = document.getElementById("r_julie_hex");
    const colIn = document.getElementById("r_julie_color");
    if (isJulieHex(t)) {
      if (hexIn) hexIn.value = t;
      if (colIn) {
        // color input wants #rrggbb
        let c = t;
        if (c.length === 4) {
          c =
            "#" +
            c[1] +
            c[1] +
            c[2] +
            c[2] +
            c[3] +
            c[3];
        } else if (c.length === 9) {
          c = c.slice(0, 7);
        }
        colIn.value = c;
      }
    } else if (hexIn && document.activeElement !== hexIn) {
      // leave custom field alone when on a preset unless empty
    }
    updatePlatePreview();
  }

  function updatePlatePreview() {
    const plate = document.getElementById("r_plate_preview");
    const cssEl = document.getElementById("r_plate_css");
    const nameEl = document.getElementById("r_name");
    const chipEl = document.getElementById("r_chip");
    const cart = document.getElementById("r_case_preview");
    const skuEl = document.getElementById("r_prev_sku");
    if (!plate) return;
    const name = (nameEl && nameEl.value.trim()) || "ROM NAME";
    plate.textContent = name;
    if (skuEl) {
      skuEl.textContent = (chipEl && chipEl.value.trim()) || "CO.SKU";
    }
    const badgeEl = document.getElementById("r_prev_badge");
    if (badgeEl) {
      badgeEl.textContent = shortPlate(
        chipEl && chipEl.value,
        nameEl && nameEl.value
      );
    }
    plate.removeAttribute("style");
    plate.classList.remove("has-custom-plate");
    const raw = (cssEl && cssEl.value || "").trim();
    if (raw) {
      plate.setAttribute("style", raw);
      plate.classList.add("has-custom-plate");
    }
    if (cart) {
      const shell = getCaseShell();
      const tint = getJulieTint();
      const hex = isJulieHex(tint);
      cart.className =
        "rc-plate-preview-cart shell-" +
        shell +
        (shell === "julie" ? (hex ? " tint-custom" : " tint-" + tint) : "");
      if (shell === "julie" && hex) {
        cart.style.setProperty("--julie", tint);
      } else {
        cart.style.removeProperty("--julie");
      }
    }
  }

  function openRomForm(r) {
    document.getElementById("dlgRomTitle").textContent = r ? "Edit ROM" : "New ROM";
    document.getElementById("r_id").value = r ? r.id : "";
    document.getElementById("r_producer").value = r
      ? r.producer_id
      : openProducerId || "";
    document.getElementById("r_name").value = r ? r.name || "" : "";
    document.getElementById("r_chip").value = r ? r.chip_code || "" : "";
    document.getElementById("r_desc").value = r ? r.description || "" : "";
    document.getElementById("r_status").value = r ? r.status || "idea" : "idea";
    document.getElementById("r_address").value = r ? r.address || "" : "";
    document.getElementById("r_launcher").checked = r
      ? r.launcher_show !== false &&
        (r.launcher_show === true ||
          (r.status === "desk" || r.status === "shipped") && !!r.address)
      : true;
    if (r && r.launcher_show === false) {
      document.getElementById("r_launcher").checked = false;
    }
    document.getElementById("r_notes").value = r ? r.notes || "" : "";
    document.getElementById("r_plate_css").value = r ? r.plate_css || "" : "";
    setCaseShell(r && r.case_shell === "julie" ? "julie" : "classicboi");
    setJulieTint((r && r.julie_tint) || "red");
    document.getElementById("r_delete").hidden = !r;
    document.getElementById("r_err").hidden = true;
    updatePlatePreview();
    showEditor(dlgR);
  }

  const plateCssEl = document.getElementById("r_plate_css");
  const romNameEl = document.getElementById("r_name");
  const romChipEl = document.getElementById("r_chip");
  if (plateCssEl) plateCssEl.addEventListener("input", updatePlatePreview);
  if (romNameEl) romNameEl.addEventListener("input", updatePlatePreview);
  if (romChipEl) romChipEl.addEventListener("input", updatePlatePreview);
  document.querySelectorAll(".rc-shell-btn").forEach((b) => {
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      setCaseShell(b.getAttribute("data-shell"));
    });
  });
  document.querySelectorAll(".rc-tint-swatch").forEach((b) => {
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      setJulieTint(b.getAttribute("data-tint"));
    });
  });
  const julieColor = document.getElementById("r_julie_color");
  const julieHex = document.getElementById("r_julie_hex");
  if (julieColor) {
    julieColor.addEventListener("input", () => {
      setJulieTint(julieColor.value);
    });
  }
  if (julieHex) {
    julieHex.addEventListener("change", () => {
      let v = julieHex.value.trim();
      if (v && !v.startsWith("#")) v = "#" + v;
      setJulieTint(v || "red");
    });
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "drawer refused");
    data = j.catalog;
    setKicker();
    return j;
  }

  formP.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("p_err");
    err.hidden = true;
    try {
      await post("/api/producer", {
        action: "upsert",
        id: document.getElementById("p_id").value,
        name: document.getElementById("p_name").value,
        chip_code: document.getElementById("p_chip").value,
        mission: document.getElementById("p_mission").value,
        hands_ven: document.getElementById("p_hands").value,
        address: document.getElementById("p_address").value,
        notes: document.getElementById("p_notes").value,
      });
      dlgP.close();
      if (openProducerId) openProducer(openProducerId);
      else showProducers();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  formR.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("r_err");
    err.hidden = true;
    try {
      await post("/api/rom", {
        action: "upsert",
        id: document.getElementById("r_id").value,
        producer_id: document.getElementById("r_producer").value,
        name: document.getElementById("r_name").value,
        chip_code: document.getElementById("r_chip").value,
        description: document.getElementById("r_desc").value,
        status: document.getElementById("r_status").value,
        address: document.getElementById("r_address").value,
        launcher_show: document.getElementById("r_launcher").checked,
        notes: document.getElementById("r_notes").value,
        plate_css: document.getElementById("r_plate_css").value,
        case_shell: getCaseShell(),
        julie_tint: getJulieTint(),
      });
      dlgR.close();
      if (openProducerId) openProducer(openProducerId);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  document.getElementById("p_cancel").onclick = () => dlgP.close();
  document.getElementById("r_cancel").onclick = () => dlgR.close();
  const btnBack = document.getElementById("btnBack");
  if (btnBack) btnBack.onclick = () => showProducers();
  document.getElementById("btnNewProducer").onclick = () => openProducerForm(null);
  document.getElementById("btnNewRom").onclick = () => {
    if (!openProducerId) return;
    openRomForm(null);
  };

  document.getElementById("p_delete").onclick = async () => {
    const id = document.getElementById("p_id").value;
    if (!id || !confirm("Remove this producer and their ROM cards from the catalog?"))
      return;
    try {
      await post("/api/producer", { action: "delete", id });
      dlgP.close();
      showProducers();
    } catch (ex) {
      alert(ex.message);
    }
  };

  document.getElementById("r_delete").onclick = async () => {
    const id = document.getElementById("r_id").value;
    if (!id || !confirm("Remove this ROM card from the shelf?")) return;
    try {
      await post("/api/rom", { action: "delete", id });
      dlgR.close();
      if (openProducerId) openProducer(openProducerId);
    } catch (ex) {
      alert(ex.message);
    }
  };

  /* ── Editors as full pages ────────────────────────────────
     Same <form>s, same fields/ids, same submit + delete handlers and API
     calls as before. Only the container changed: the dialog now opens
     in-page (show) instead of as a tiny modal (showModal). */
  let editorCtx = null;

  function editorSnapshot(form) {
    return Array.from(form.elements)
      .filter((el) => el.id)
      .map((el) => el.id + "=" + (el.type === "checkbox" ? el.checked : el.value))
      .join("\u0001");
  }

  function editorDirty(dlg) {
    const form = dlg === dlgR ? formR : formP;
    return !!(dlg.open && dlg._rcSnap != null && editorSnapshot(form) !== dlg._rcSnap);
  }

  function autoGrow(ta) {
    if (!ta || !ta.isConnected) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + 2 + "px";
  }

  function editorCrumbs(parts) {
    return parts
      .map((pt) =>
        pt.go
          ? `<button type="button" class="rc-crumb" data-ed-go="${esc(pt.go)}">${esc(pt.label)}</button>`
          : `<span class="rc-crumb-here" aria-current="page">${esc(pt.label)}</span>`
      )
      .join(`<span class="rc-crumb-sep" aria-hidden="true">›</span>`);
  }

  function showEditor(dlg) {
    const isRom = dlg === dlgR;
    const form = isRom ? formR : formP;
    const rid = isRom ? document.getElementById("r_id").value : "";
    const pid = isRom ? document.getElementById("r_producer").value : document.getElementById("p_id").value;
    const p = pid ? producerById(pid) : null;
    const r = rid ? romById(rid) : null;
    editorCtx = {
      kind: isRom ? "rom" : "producer",
      romId: rid || null,
      producerId: pid || null,
      isNew: isRom ? !rid : !pid,
      ids: ((isRom ? data.roms : data.producers) || []).map((x) => x.id),
      route: null,
    };

    const parts = [{ label: "Producers", go: "home" }];
    if (isRom) {
      if (p) parts.push({ label: p.name || p.id, go: "producer:" + p.id });
      if (r) parts.push({ label: r.name || r.id, go: "rom:" + r.id });
      parts.push({ label: r ? "Edit" : "New ROM" });
    } else if (p) {
      parts.push({ label: p.name || p.id, go: "producer:" + p.id }, { label: "Edit" });
    } else {
      parts.push({ label: "New producer" });
    }
    const nav = document.getElementById(isRom ? "r_crumbs" : "p_crumbs");
    if (nav) nav.innerHTML = editorCrumbs(parts);
    const sub = document.getElementById(isRom ? "r_sub" : "p_sub");
    if (sub) {
      sub.textContent = isRom
        ? r
          ? (r.name || r.id) + (p ? " · " + p.name : "")
          : p
          ? "New ROM for " + p.name
          : "New ROM"
        : p
        ? p.name || p.id
        : "A new maker for the catalog";
    }
    dlg.style.setProperty("--hue", producerHue(pid));

    // the form becomes the page
    viewProducers.hidden = true;
    viewProducer.hidden = true;
    if (viewRom) viewRom.hidden = true;

    // own URL so refresh stays in the editor
    writeNav(pid || "");
    const hash = isRom
      ? rid
        ? "#edit-r=" + encodeURIComponent(rid)
        : "#new-r=" + encodeURIComponent(pid)
      : pid
      ? "#edit-p=" + encodeURIComponent(pid)
      : "#new-p";
    try {
      const u = new URL(window.location.href);
      history.replaceState(null, "", u.pathname + u.search + hash);
    } catch (e) {
      /* */
    }

    if (!dlg.open) dlg.show();
    form.querySelectorAll("textarea").forEach(autoGrow);
    dlg._rcSnap = editorSnapshot(form);
    const first = document.getElementById(isRom ? "r_name" : "p_name");
    if (first) first.focus({ preventScroll: true });
    const main = document.querySelector(".rc-main");
    if (main) main.scrollTop = 0;
  }

  function leaveEditor(dlg, route) {
    if (editorDirty(dlg) && !confirm("Discard your unsaved changes?")) return false;
    if (editorCtx) editorCtx.route = route || null;
    dlg._rcSnap = null;
    dlg.close();
    return true;
  }

  function afterEditorClose(dlg) {
    const ctx = editorCtx;
    editorCtx = null;
    dlg._rcSnap = null;
    returnToRomAfterEdit = null;
    if (!data) return;
    const route = (ctx && ctx.route) || "";
    if (route === "home") return showProducers();
    if (route.startsWith("producer:") && producerById(route.slice(9))) return openProducer(route.slice(9));
    if (route.startsWith("rom:") && romById(route.slice(4))) return showRom(route.slice(4));
    if (ctx && ctx.kind === "rom") {
      if (ctx.romId && romById(ctx.romId)) return showRom(ctx.romId);
      if (ctx.isNew) {
        const fresh = (data.roms || []).find((x) => !ctx.ids.includes(x.id));
        if (fresh) return showRom(fresh.id);
      }
      const pid = ctx.producerId || openProducerId;
      if (pid && producerById(pid)) return openProducer(pid);
      return showProducers();
    }
    if (ctx && ctx.kind === "producer") {
      if (ctx.producerId && producerById(ctx.producerId)) return openProducer(ctx.producerId);
      if (ctx.isNew) {
        const fresh = (data.producers || []).find((x) => !ctx.ids.includes(x.id));
        if (fresh) return openProducer(fresh.id);
      }
      return showProducers();
    }
    if (openProducerId && producerById(openProducerId)) openProducer(openProducerId);
    else showProducers();
  }

  dlgR.addEventListener("close", () => afterEditorClose(dlgR));
  dlgP.addEventListener("close", () => afterEditorClose(dlgP));

  [
    [formR, dlgR, "r_cancel"],
    [formP, dlgP, "p_cancel"],
  ].forEach(([form, dlg, cancelId]) => {
    // unsaved-changes guard runs before the existing cancel handler
    form.addEventListener(
      "click",
      (e) => {
        const t = e.target instanceof Element ? e.target : null;
        if (!t) return;
        if (t.closest("#" + cancelId)) {
          if (editorDirty(dlg) && !confirm("Discard your unsaved changes?")) {
            e.stopPropagation();
            e.preventDefault();
          } else {
            dlg._rcSnap = null;
          }
          return;
        }
        const go = t.closest("[data-ed-go]");
        if (go) {
          e.preventDefault();
          leaveEditor(dlg, go.getAttribute("data-ed-go"));
        }
      },
      true
    );
    form.addEventListener("input", (e) => {
      if (e.target && e.target.tagName === "TEXTAREA") autoGrow(e.target);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    const dlg = dlgR.open ? dlgR : dlgP.open ? dlgP : null;
    if (!dlg) return;
    e.preventDefault();
    const btn = document.getElementById(dlg === dlgR ? "r_cancel" : "p_cancel");
    if (btn) btn.click();
  });

  window.addEventListener("beforeunload", (e) => {
    if (editorDirty(dlgR) || editorDirty(dlgP)) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  window.addEventListener("resize", () => {
    const dlg = dlgR.open ? dlgR : dlgP.open ? dlgP : null;
    if (dlg) dlg.querySelectorAll("textarea").forEach(autoGrow);
  });

  /** Refresh while editing: #edit-r= / #new-r= / #edit-p= / #new-p */
  function resumeEditor(h) {
    let m;
    if ((m = h.match(/^edit-r=(.+)$/))) {
      const r = romById(decodeURIComponent(m[1]));
      if (r) {
        showRom(r.id);
        openRomForm(r);
      }
    } else if ((m = h.match(/^new-r=(.+)$/))) {
      const pid = decodeURIComponent(m[1]);
      if (producerById(pid)) {
        openProducer(pid);
        openRomForm(null);
      }
    } else if ((m = h.match(/^edit-p=(.+)$/))) {
      const p = producerById(decodeURIComponent(m[1]));
      if (p) {
        openProducer(p.id);
        openProducerForm(p);
      }
    } else if (h === "new-p") {
      showProducers();
      openProducerForm(null);
    }
  }

  fetch("/api/catalog?_=" + Date.now())
    .then((r) => r.json())
    .then((j) => {
      data = j;
      setKicker();
      // Restore bay after refresh (hash / ?p= / localStorage) — stay where you were editing
      const edHash = (window.location.hash || "").replace(/^#/, "");
      const resume = readNavProducerId();
      const resumeRom = readNavRomId();
      if (resumeRom && romById(resumeRom)) {
        showRom(resumeRom);
      } else if (resume && producerById(resume)) {
        openProducer(resume);
      } else {
        showProducers();
      }
      resumeEditor(edHash);
    })
    .catch((e) => {
      if (kicker) kicker.textContent = "catalog locked: " + e.message;
    });

  // Browser back/forward between home and a producer bay
  window.addEventListener("hashchange", () => {
    if (!data) return;
    if (dlgR.open || dlgP.open) return;
    const romHash = readNavRomId();
    if (romHash && romById(romHash)) {
      if (openRomId !== romHash) showRom(romHash);
      return;
    }
    const resume = readNavProducerId();
    if (resume && producerById(resume)) {
      if (openProducerId !== resume || openRomId) openProducer(resume);
    } else if (openProducerId) {
      showProducers();
    }
  });
})();
