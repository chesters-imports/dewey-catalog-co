/* ROM Cat · yellow pages of producers → ROMs */

(function () {
  const kicker = document.getElementById("kicker");
  const foot = document.getElementById("foot");
  const viewProducers = document.getElementById("viewProducers");
  const viewProducer = document.getElementById("viewProducer");
  const producerShelf = document.getElementById("producerShelf");
  const producerCard = document.getElementById("producerCard");
  const romBins = document.getElementById("romBins");

  const dlgP = document.getElementById("dlgProducer");
  const dlgR = document.getElementById("dlgRom");
  const formP = document.getElementById("formProducer");
  const formR = document.getElementById("formRom");

  let data = null;
  let openProducerId = null;
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

    // Compact bay strip — room for ROM cart faces, not a huge empty card
    producerCard.className = "rc-bay-strip";
    const oneLiner = [
      p.mission ? p.mission.slice(0, 100) + (p.mission.length > 100 ? "…" : "") : "",
      p.hands_ven ? "VEN " + p.hands_ven : "",
      p.address || "",
    ]
      .filter(Boolean)
      .join(" · ");
    producerCard.innerHTML =
      `<div class="rc-bay-strip-row">` +
      `<button type="button" class="rc-back rc-back-inline" id="btnBackInner">← producers</button>` +
      `<div class="rc-bay-id">` +
      `<span class="rc-index-name">${esc(p.name)}</span>` +
      `<span class="rc-index-chip">${esc(p.chip_code || "—")}</span>` +
      `</div>` +
      `<button type="button" class="rc-btn rc-btn-compact" id="btnEditProducer">edit</button>` +
      `</div>` +
      `<p class="rc-bay-oneliner">${esc(oneLiner || "no mission / address on file")}</p>`;

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
          `<button type="button" class="rc-rom-product" data-edit-rom="${esc(r.id)}" title="${esc(
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
    dlgP.showModal();
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
    dlgR.showModal();
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

  fetch("/api/catalog?_=" + Date.now())
    .then((r) => r.json())
    .then((j) => {
      data = j;
      setKicker();
      // Restore bay after refresh (hash / ?p= / localStorage) — stay where you were editing
      const resume = readNavProducerId();
      if (resume && producerById(resume)) {
        openProducer(resume);
      } else {
        showProducers();
      }
    })
    .catch((e) => {
      if (kicker) kicker.textContent = "catalog locked: " + e.message;
    });

  // Browser back/forward between home and a producer bay
  window.addEventListener("hashchange", () => {
    if (!data) return;
    const resume = readNavProducerId();
    if (resume && producerById(resume)) {
      if (openProducerId !== resume) openProducer(resume);
    } else if (openProducerId) {
      showProducers();
    }
  });
})();
