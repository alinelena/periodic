/**
 * Interactive Periodic Table Website Logic
 * Powered by YAML element files & Bootstrap 5
 */
document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("pt-data-json");
  if (!dataEl) return;

  const DATA = JSON.parse(dataEl.textContent);
  const elementsBySym = {};
  const elementsByZ = {};
  DATA.elements.forEach((el) => {
    elementsBySym[el.symbol] = el;
    elementsByZ[el.atomic_number] = el;
  });

  const gridEl = document.getElementById("pt-main-grid");
  const elemNodes = Array.from(document.querySelectorAll(".pt-elem"));
  const tableRows = Array.from(document.querySelectorAll(".pt-table-row"));
  const searchInput = document.getElementById("pt-search-input");
  const matchCountEl = document.getElementById("pt-match-count");
  const resetBtn = document.getElementById("pt-reset-btn");
  const colorModeSelect = document.getElementById("pt-color-mode");
  const heatmapLegend = document.getElementById("pt-heatmap-legend");
  const heatmapTitle = document.getElementById("pt-heatmap-title");
  const heatmapMin = document.getElementById("pt-heatmap-min");
  const heatmapMax = document.getElementById("pt-heatmap-max");

  // Filter state
  const state = {
    search: "",
    categories: new Set(),
    phases: new Set(),
    markers: new Set(),
    group: null,
    period: null,
    spotlight: null, // temporary hover filter { type, value }
    currentModalZ: 1,
  };

  // Format oxidation states with bold common values
  function formatOxHtml(el) {
    if (!el.oxidation_states_parsed || el.oxidation_states_parsed.length === 0) {
      return el.oxidation_states || "";
    }
    return el.oxidation_states_parsed
      .map((item) => (item.common ? `<strong>${item.state}</strong>` : `${item.state}`))
      .join(" ");
  }

  // Update enlarged sample element card on hover
  const sampleCard = document.getElementById("pt-sample-card");
  function updateSampleCard(el) {
    if (!el || !sampleCard) return;
    const cat = DATA.categories[el.category];
    sampleCard.style.setProperty("--cat-stroke", cat.stroke);
    sampleCard.style.setProperty("--cat-fill", cat.fill);
    sampleCard.style.setProperty("--cat-stroke-dark", cat.stroke_dark);
    sampleCard.style.setProperty("--cat-fill-dark", cat.fill_dark);
    sampleCard.dataset.symbol = el.symbol;

    const phaseObj = DATA.phases[el.phase] || DATA.phases.unknown;
    let iconsHtml = `<span class="pt-phase-icon" style="color:${phaseObj.color}" title="${phaseObj.label}">${phaseObj.symbol}</span>`;
    if (el.lab_made) {
      iconsHtml += `<span class="pt-marker-icon" style="color:${DATA.markers.lab.color}" title="${DATA.markers.lab.label}">${DATA.markers.lab.symbol}</span>`;
    }
    if (el.radioactive_marker || el.is_radioactive) {
      iconsHtml += `<span class="pt-marker-icon" style="color:${DATA.markers.radioactive.color}" title="${DATA.markers.radioactive.label}">${DATA.markers.radioactive.symbol}</span>`;
    }

    document.getElementById("sample-z").innerHTML = `<strong>${el.atomic_number}</strong>${iconsHtml}`;
    document.getElementById("sample-ox").innerHTML = formatOxHtml(el);
    document.getElementById("sample-mass").textContent = el.atomic_mass;
    document.getElementById("sample-ion").textContent = el.ionization_energy;
    document.getElementById("sample-rad").textContent = el.atomic_radius;
    document.getElementById("sample-aff").textContent = el.electron_affinity;
    document.getElementById("sample-sym").textContent = el.symbol;
    document.getElementById("sample-name").textContent = el.name;
    document.getElementById("sample-conf").innerHTML = el.electron_configuration_html;
  }

  if (sampleCard) {
    sampleCard.addEventListener("click", () => {
      const sym = sampleCard.dataset.symbol || "Tc";
      if (elementsBySym[sym]) {
        openElementModal(elementsBySym[sym].atomic_number);
      }
    });
  }

  // Callout label hover highlights corresponding field across all cards
  document.querySelectorAll("[data-highlight-prop]").forEach((lbl) => {
    const prop = lbl.dataset.highlightProp;
    lbl.addEventListener("mouseenter", () => {
      gridEl.setAttribute("data-highlight-prop", prop);
      sampleCard.setAttribute("data-highlight-prop", prop);
    });
    lbl.addEventListener("mouseleave", () => {
      gridEl.removeAttribute("data-highlight-prop");
      sampleCard.removeAttribute("data-highlight-prop");
    });
  });

  // Check if an element matches active filters + search + spotlight
  function matchesElement(el) {
    if (state.spotlight) {
      const sp = state.spotlight;
      if (sp.type === "category" && el.category !== sp.value) return false;
      if (sp.type === "phase" && el.phase !== sp.value) return false;
      if (sp.type === "marker") {
        if (sp.value === "lab" && !el.lab_made) return false;
        if (sp.value === "radio" && !el.is_radioactive) return false;
      }
      if (sp.type === "group" && el.group !== sp.value) return false;
      if (sp.type === "period" && el.period !== sp.value) return false;
    }

    if (state.categories.size > 0 && !state.categories.has(el.category)) return false;
    if (state.phases.size > 0 && !state.phases.has(el.phase)) return false;
    if (state.markers.has("lab") && !el.lab_made) return false;
    if (state.markers.has("radio") && !el.is_radioactive) return false;
    if (state.group !== null && el.group !== state.group) return false;
    if (state.period !== null && el.period !== state.period) return false;

    if (state.search) {
      const q = state.search.toLowerCase();
      const symMatch = el.symbol.toLowerCase().includes(q);
      const nameMatch = el.name.toLowerCase().includes(q);
      const zMatch = String(el.atomic_number) === q;
      const catMatch = el.category_label.toLowerCase().includes(q);
      const confMatch =
        el.electron_configuration.toLowerCase().includes(q) ||
        el.electron_configuration_formatted.toLowerCase().includes(q);
      const oxMatch = el.oxidation_states.toLowerCase().includes(q);
      if (!(symMatch || nameMatch || zMatch || catMatch || confMatch || oxMatch)) {
        return false;
      }
    }
    return true;
  }

  function hasActivePermanentFilters() {
    return (
      state.search !== "" ||
      state.categories.size > 0 ||
      state.phases.size > 0 ||
      state.markers.size > 0 ||
      state.group !== null ||
      state.period !== null
    );
  }

  function applyFilters() {
    let matchCount = 0;
    const anyFilter = hasActivePermanentFilters() || state.spotlight !== null;

    elemNodes.forEach((node) => {
      const sym = node.dataset.symbol;
      const el = elementsBySym[sym];
      const matched = matchesElement(el);
      if (matched) matchCount++;
      node.classList.toggle("pt-dimmed", anyFilter && !matched);
      node.classList.toggle("pt-matched", anyFilter && matched);
    });

    // Also dim/highlight La-Lu and Ac-Lr placeholders
    document.querySelectorAll(".pt-placeholder").forEach((node) => {
      const cat = node.dataset.category;
      let matched = true;
      if (state.spotlight && state.spotlight.type === "category") {
        matched = state.spotlight.value === cat;
      } else if (state.categories.size > 0) {
        matched = state.categories.has(cat);
      } else if (state.group !== null) {
        matched = state.group === 3;
      } else if (state.search || state.phases.size > 0 || state.markers.size > 0 || state.period !== null) {
        matched = false;
      }
      node.classList.toggle("pt-dimmed", anyFilter && !matched);
    });

    // Filter Data Table rows as well
    tableRows.forEach((row) => {
      const sym = row.dataset.symbol;
      const el = elementsBySym[sym];
      const matched = matchesElement(el);
      row.classList.toggle("d-none", hasActivePermanentFilters() && !matched);
    });

    if (matchCountEl) {
      matchCountEl.textContent = `${matchCount} / 118`;
    }
    if (resetBtn) {
      resetBtn.classList.toggle("d-none", !hasActivePermanentFilters());
    }
  }

  // Bind Category Filter Buttons & Placeholders
  document.querySelectorAll("[data-category-filter]").forEach((btn) => {
    const cat = btn.dataset.categoryFilter;
    btn.addEventListener("mouseenter", () => {
      state.spotlight = { type: "category", value: cat };
      applyFilters();
    });
    btn.addEventListener("mouseleave", () => {
      state.spotlight = null;
      applyFilters();
    });
    btn.addEventListener("click", () => {
      if (state.categories.has(cat)) {
        state.categories.delete(cat);
      } else {
        state.categories.add(cat);
      }
      document
        .querySelectorAll(`.pt-cat-box[data-category-filter="${cat}"]`)
        .forEach((b) => b.classList.toggle("active", state.categories.has(cat)));
      state.spotlight = null;
      applyFilters();
    });
  });

  // Bind Phase Filter Buttons
  document.querySelectorAll("[data-phase-filter]").forEach((btn) => {
    const ph = btn.dataset.phaseFilter;
    btn.addEventListener("mouseenter", () => {
      state.spotlight = { type: "phase", value: ph };
      applyFilters();
    });
    btn.addEventListener("mouseleave", () => {
      state.spotlight = null;
      applyFilters();
    });
    btn.addEventListener("click", () => {
      if (state.phases.has(ph)) {
        state.phases.delete(ph);
      } else {
        state.phases.add(ph);
      }
      btn.classList.toggle("active", state.phases.has(ph));
      state.spotlight = null;
      applyFilters();
    });
  });

  // Bind Marker Filter Buttons (radioactive / lab made)
  document.querySelectorAll("[data-marker-filter]").forEach((btn) => {
    const mk = btn.dataset.markerFilter;
    btn.addEventListener("mouseenter", () => {
      state.spotlight = { type: "marker", value: mk };
      applyFilters();
    });
    btn.addEventListener("mouseleave", () => {
      state.spotlight = null;
      applyFilters();
    });
    btn.addEventListener("click", () => {
      if (state.markers.has(mk)) {
        state.markers.delete(mk);
      } else {
        state.markers.add(mk);
      }
      btn.classList.toggle("active", state.markers.has(mk));
      state.spotlight = null;
      applyFilters();
    });
  });

  // Bind Group & Period Headers
  document.querySelectorAll("[data-group-filter]").forEach((btn) => {
    const grp = parseInt(btn.dataset.groupFilter, 10);
    btn.addEventListener("mouseenter", () => {
      state.spotlight = { type: "group", value: grp };
      applyFilters();
    });
    btn.addEventListener("mouseleave", () => {
      state.spotlight = null;
      applyFilters();
    });
    btn.addEventListener("click", () => {
      state.group = state.group === grp ? null : grp;
      document.querySelectorAll("[data-group-filter]").forEach((b) => {
        b.classList.toggle("active", parseInt(b.dataset.groupFilter, 10) === state.group);
      });
      state.spotlight = null;
      applyFilters();
    });
  });

  document.querySelectorAll("[data-period-filter]").forEach((btn) => {
    const prd = parseInt(btn.dataset.periodFilter, 10);
    btn.addEventListener("mouseenter", () => {
      state.spotlight = { type: "period", value: prd };
      applyFilters();
    });
    btn.addEventListener("mouseleave", () => {
      state.spotlight = null;
      applyFilters();
    });
    btn.addEventListener("click", () => {
      state.period = state.period === prd ? null : prd;
      document.querySelectorAll("[data-period-filter]").forEach((b) => {
        b.classList.toggle("active", parseInt(b.dataset.periodFilter, 10) === state.period);
      });
      state.spotlight = null;
      applyFilters();
    });
  });

  // Search Input
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      applyFilters();
    });
  }

  // Keyboard shortcuts ('/' to search, 'Escape' to clear, Left/Right in modal)
  document.addEventListener("keydown", (e) => {
    const modalEl = document.getElementById("elementModal");
    const isModalOpen = modalEl && modalEl.classList.contains("show");
    if (isModalOpen) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevZ = state.currentModalZ > 1 ? state.currentModalZ - 1 : 118;
        openElementModal(prevZ);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextZ = state.currentModalZ < 118 ? state.currentModalZ + 1 : 1;
        openElementModal(nextZ);
      }
      return;
    }

    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput?.focus();
    } else if (e.key === "Escape") {
      resetAllFilters();
    }
  });

  function resetAllFilters() {
    state.search = "";
    state.categories.clear();
    state.phases.clear();
    state.markers.clear();
    state.group = null;
    state.period = null;
    state.spotlight = null;
    if (searchInput) searchInput.value = "";
    document
      .querySelectorAll(".pt-cat-box.active, .pt-state-btn.active, .pt-group-hdr.active, .pt-period-hdr.active")
      .forEach((b) => b.classList.remove("active"));
    applyFilters();
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetAllFilters);
  }

  // Element Tile Hover & Click
  elemNodes.forEach((node) => {
    const sym = node.dataset.symbol;
    const el = elementsBySym[sym];
    node.addEventListener("mouseenter", () => updateSampleCard(el));
    node.addEventListener("click", () => openElementModal(el.atomic_number));
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openElementModal(el.atomic_number);
      }
    });
  });

  // Table Row Click & Sorting
  tableRows.forEach((row) => {
    row.addEventListener("click", () => {
      const z = parseInt(row.dataset.z, 10);
      openElementModal(z);
    });
  });

  let currentSortCol = "atomic_number";
  let currentSortAsc = true;
  document.querySelectorAll("#pt-data-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (currentSortCol === col) {
        currentSortAsc = !currentSortAsc;
      } else {
        currentSortCol = col;
        currentSortAsc = true;
      }
      const tbody = document.getElementById("pt-table-body");
      const sortedRows = [...tableRows].sort((a, b) => {
        const elA = elementsBySym[a.dataset.symbol];
        const elB = elementsBySym[b.dataset.symbol];
        let vA = elA[col];
        let vB = elB[col];
        if (vA === null || vA === undefined) return 1;
        if (vB === null || vB === undefined) return -1;
        if (typeof vA === "string") {
          return currentSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
        }
        return currentSortAsc ? vA - vB : vB - vA;
      });
      sortedRows.forEach((r) => tbody.appendChild(r));
    });
  });

  // Density Toggle (Detailed vs Compact)
  document.querySelectorAll('input[name="pt-density"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      gridEl.classList.toggle("pt-compact-mode", e.target.value === "compact");
    });
  });

  // Background Theme Toggle (Light vs Dark)
  document.querySelectorAll('input[name="pt-bg-theme"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const isDark = e.target.value === "dark";
      document.body.classList.toggle("pt-dark-theme", isDark);
      document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");
    });
  });

  // Color Mode & Heatmap Logic
  const BLOCK_COLORS = {
    s: { stroke: "#98070c", fill: "#faede6" },
    p: { stroke: "#00739e", fill: "#eaf3f9" },
    d: { stroke: "#fdbe81", fill: "#fffbf7" },
    f: { stroke: "#b57fb8", fill: "#f9f7fb" },
  };

  const PHASE_STYLES = {
    solid: { stroke: "#9e5e06", fill: "#faf3ea" },
    gas: { stroke: "#6c9ed4", fill: "#f5f7fd" },
    liquid: { stroke: "#00739e", fill: "#eaf3f9" },
    unknown: { stroke: "#fdbe81", fill: "#fffbf7" },
  };

  const HEATMAP_META = {
    atomic_radius_angstrom: { label: "Atomic Radius [Å]", unit: "Å" },
    ionization_energy_ev: { label: "1st Ionisation Energy [eV]", unit: "eV" },
    electron_affinity_ev: { label: "Electron Affinity [eV]", unit: "eV" },
    atomic_mass_value: { label: "Relative Atomic Mass [Da]", unit: "Da" },
  };

  function interpolateHeatmapColor(t) {
    // Smooth interpolation from soft sky blue (#e0f2fe) -> teal (#5eead4) -> amber (#fde047) -> coral (#fb7185)
    const stops = [
      [224, 242, 254],
      [125, 211, 252],
      [94, 234, 212],
      [253, 224, 71],
      [251, 113, 133],
    ];
    const scaled = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const idx = Math.min(Math.floor(scaled), stops.length - 2);
    const frac = scaled - idx;
    const c0 = stops[idx];
    const c1 = stops[idx + 1];
    const r = Math.round(c0[0] + (c1[0] - c0[0]) * frac);
    const g = Math.round(c0[1] + (c1[1] - c0[1]) * frac);
    const b = Math.round(c0[2] + (c1[2] - c0[2]) * frac);
    const strokeR = Math.max(0, r - 65);
    const strokeG = Math.max(0, g - 65);
    const strokeB = Math.max(0, b - 65);
    return {
      fill: `rgb(${r}, ${g}, ${b})`,
      stroke: `rgb(${strokeR}, ${strokeG}, ${strokeB})`,
    };
  }

  function applyColorMode(mode) {
    gridEl.dataset.colorMode = mode;
    if (mode === "category") {
      heatmapLegend.classList.add("d-none");
      elemNodes.forEach((node) => {
        const el = elementsBySym[node.dataset.symbol];
        const cat = DATA.categories[el.category];
        node.style.setProperty("--cat-stroke", cat.stroke);
        node.style.setProperty("--cat-fill", cat.fill);
        node.querySelector(".pt-heatmap-val").textContent = "";
      });
    } else if (mode === "phase") {
      heatmapLegend.classList.add("d-none");
      elemNodes.forEach((node) => {
        const el = elementsBySym[node.dataset.symbol];
        const st = PHASE_STYLES[el.phase] || PHASE_STYLES.unknown;
        node.style.setProperty("--cat-stroke", st.stroke);
        node.style.setProperty("--cat-fill", st.fill);
        node.querySelector(".pt-heatmap-val").textContent = "";
      });
    } else if (mode === "block") {
      heatmapLegend.classList.add("d-none");
      elemNodes.forEach((node) => {
        const el = elementsBySym[node.dataset.symbol];
        const st = BLOCK_COLORS[el.block] || BLOCK_COLORS.s;
        node.style.setProperty("--cat-stroke", st.stroke);
        node.style.setProperty("--cat-fill", st.fill);
        node.querySelector(".pt-heatmap-val").textContent = `${el.block}-block`;
      });
    } else if (HEATMAP_META[mode]) {
      const meta = HEATMAP_META[mode];
      const vals = DATA.elements.map((e) => e[mode]).filter((v) => v !== null && v !== undefined);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      heatmapTitle.textContent = meta.label;
      heatmapMin.textContent = `${minV} ${meta.unit}`;
      heatmapMax.textContent = `${maxV} ${meta.unit}`;
      heatmapLegend.classList.remove("d-none");

      elemNodes.forEach((node) => {
        const el = elementsBySym[node.dataset.symbol];
        const val = el[mode];
        const badgeEl = node.querySelector(".pt-heatmap-val");
        if (val === null || val === undefined) {
          node.style.setProperty("--cat-stroke", "#adb5bd");
          node.style.setProperty("--cat-fill", "#f1f3f5");
          badgeEl.textContent = "N/A";
        } else {
          const t = (val - minV) / (maxV - minV || 1);
          const col = interpolateHeatmapColor(t);
          node.style.setProperty("--cat-stroke", col.stroke);
          node.style.setProperty("--cat-fill", col.fill);
          badgeEl.textContent = `${val} ${meta.unit}`;
        }
      });
    }
  }

  if (colorModeSelect) {
    colorModeSelect.addEventListener("change", (e) => applyColorMode(e.target.value));
  }

  // Element Detail Modal
  let bsModal = null;
  function openElementModal(z) {
    const el = elementsByZ[z];
    if (!el) return;
    state.currentModalZ = z;

    const modalEl = document.getElementById("elementModal");
    if (!bsModal && window.bootstrap) {
      bsModal = new window.bootstrap.Modal(modalEl);
    }

    const cat = DATA.categories[el.category];
    const phaseObj = DATA.phases[el.phase] || DATA.phases.unknown;

    const zBadge = document.getElementById("modal-z-badge");
    zBadge.textContent = `#${el.atomic_number}`;
    zBadge.style.backgroundColor = cat.stroke;
    zBadge.style.color = "#fff";

    document.getElementById("elementModalLabel").textContent = `${el.name} (${el.symbol})`;

    const catBadge = document.getElementById("modal-cat-badge");
    catBadge.textContent = el.category_label;
    catBadge.style.backgroundColor = cat.fill;
    catBadge.style.color = "#231f20";
    catBadge.style.border = `1.5px solid ${cat.stroke}`;

    // Populate modal preview card (exact clone of the element tile)
    const previewEl = document.getElementById("modal-card-preview");
    const origTile = document.getElementById(`elem-${el.symbol}`);
    if (origTile && previewEl) {
      previewEl.style.setProperty("--cat-stroke", cat.stroke);
      previewEl.style.setProperty("--cat-fill", cat.fill);
      previewEl.style.setProperty("--cat-stroke-dark", cat.stroke_dark);
      previewEl.style.setProperty("--cat-fill-dark", cat.fill_dark);
      previewEl.innerHTML = origTile.innerHTML;
    }

    // Status badges
    const badgesEl = document.getElementById("modal-status-badges");
    let badgesHtml = `<span class="badge bg-light text-dark border"><span style="color:${phaseObj.color}">${phaseObj.symbol}</span> ${phaseObj.label}</span>`;
    badgesHtml += `<span class="badge bg-light text-dark border">${el.block}-block</span>`;
    if (el.lab_made) {
      badgesHtml += `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">${DATA.markers.lab.symbol} Lab made</span>`;
    }
    if (el.is_radioactive) {
      badgesHtml += `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">${DATA.markers.radioactive.symbol} Radioactive</span>`;
    }
    badgesEl.innerHTML = badgesHtml;

    // Oxidation state badges
    let oxBadges = `<span class="text-muted">Unknown (U)</span>`;
    if (el.oxidation_states_parsed && el.oxidation_states_parsed.length > 0) {
      oxBadges = el.oxidation_states_parsed
        .map((item) =>
          item.common
            ? `<span class="badge bg-dark me-1" title="Most common oxidation state">${item.state}</span>`
            : `<span class="badge bg-secondary-subtle text-secondary-emphasis border me-1">${item.state}</span>`
        )
        .join("");
    }

    // Properties table
    const propsBody = document.getElementById("modal-props-tbody");
    propsBody.innerHTML = `
      <tr><th class="w-40">Atomic Number (Z)</th><td class="fw-bold">${el.atomic_number}</td></tr>
      <tr><th>Symbol &amp; Name</th><td><strong>${el.symbol}</strong> — ${el.name}</td></tr>
      <tr><th>Category</th><td>${el.category_label} (<code>${el.category}</code>)</td></tr>
      <tr><th>Period &amp; Group</th><td>Period ${el.period}, Group ${el.group_label} (${el.block}-block)</td></tr>
      <tr><th>Phase @ 273 K</th><td><span style="color:${phaseObj.color}">${phaseObj.symbol}</span> ${phaseObj.label}</td></tr>
      <tr><th>Relative Atomic Mass</th><td><strong>${el.atomic_mass}</strong> Da ${el.atomic_mass_most_stable_isotope ? '<small class="text-muted">(most stable isotope)</small>' : ""}</td></tr>
      <tr><th>Oxidation States</th><td>${oxBadges} <small class="text-muted d-block mt-1">(Dark badge = most common state in periodic-table.typ)</small></td></tr>
      <tr><th>1st Ionisation Energy</th><td><strong>${el.ionization_energy}</strong> ${el.ionization_energy_ev !== null ? "eV" : ""}</td></tr>
      <tr><th>Electron Affinity</th><td><strong>${el.electron_affinity}</strong> ${el.electron_affinity_ev !== null ? "eV" : el.electron_affinity === "Ns" ? '<small class="text-muted">(Not stable)</small>' : ""}</td></tr>
      <tr><th>Atomic Radius (van der Waals)</th><td><strong>${el.atomic_radius}</strong> ${el.atomic_radius_angstrom !== null ? "Å" : ""}</td></tr>
      <tr><th>Ground State Configuration</th><td class="fs-6">${el.electron_configuration_html}</td></tr>
    `;

    // Links & YAML Source
    const yamlUrl = `elements/${el.symbol}.yaml`;
    document.getElementById("modal-rsc-link").href = el.rsc_url;
    document.getElementById("modal-yaml-link").href = yamlUrl;
    document.getElementById("modal-yaml-filename").textContent = `${el.symbol}.yaml`;

    const yamlCodeEl = document.getElementById("modal-yaml-code");
    yamlCodeEl.textContent = DATA.rawYaml[el.symbol] || "";

    // Also fetch live YAML file in case it was updated on server
    fetch(yamlUrl)
      .then((res) => (res.ok ? res.text() : null))
      .then((txt) => {
        if (txt && state.currentModalZ === z) {
          yamlCodeEl.textContent = txt;
        }
      })
      .catch(() => {});

    if (bsModal) {
      bsModal.show();
    }
  }

  document.getElementById("modal-prev-btn")?.addEventListener("click", () => {
    const prevZ = state.currentModalZ > 1 ? state.currentModalZ - 1 : 118;
    openElementModal(prevZ);
  });
  document.getElementById("modal-next-btn")?.addEventListener("click", () => {
    const nextZ = state.currentModalZ < 118 ? state.currentModalZ + 1 : 1;
    openElementModal(nextZ);
  });

  document.getElementById("modal-copy-yaml-btn")?.addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const txt = document.getElementById("modal-yaml-code")?.textContent || "";
    navigator.clipboard.writeText(txt).then(() => {
      const orig = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = orig;
      }, 1500);
    });
  });

  // Property Trends SVG Chart (Tab 2)
  const trendSelect = document.getElementById("pt-trend-select");
  const trendSvg = document.getElementById("pt-trend-svg");
  const chartTooltip = document.getElementById("pt-chart-tooltip");

  function renderTrendChart(propKey) {
    if (!trendSvg) return;
    const meta = HEATMAP_META[propKey] || HEATMAP_META.ionization_energy_ev;
    const pts = DATA.elements
      .filter((e) => e[propKey] !== null && e[propKey] !== undefined)
      .map((e) => ({ z: e.atomic_number, val: e[propKey], el: e }));

    const W = 1000;
    const H = 420;
    const padL = 65;
    const padR = 30;
    const padT = 30;
    const padB = 50;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const minY = Math.min(0, ...pts.map((p) => p.val));
    const maxY = Math.max(...pts.map((p) => p.val)) * 1.06;

    const xOf = (z) => padL + ((z - 1) / 117) * plotW;
    const yOf = (v) => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

    let svgHtml = "";

    // Horizontal grid lines
    const yTicks = 6;
    for (let i = 0; i <= yTicks; i++) {
      const v = minY + ((maxY - minY) * i) / yTicks;
      const y = yOf(v);
      svgHtml += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#dee2e6" stroke-dasharray="4 4"/>`;
      svgHtml += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6c757d">${v.toFixed(1)}</text>`;
    }

    // X-axis ticks (Noble gases + 1)
    [1, 2, 10, 18, 36, 54, 86, 118].forEach((z) => {
      const x = xOf(z);
      const sym = elementsByZ[z].symbol;
      svgHtml += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#e9ecef"/>`;
      svgHtml += `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" font-size="11" fill="#495057">${z} (${sym})</text>`;
    });

    // Axes labels
    svgHtml += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="13" font-weight="bold" fill="#212529">Atomic Number (Z)</text>`;
    svgHtml += `<text x="18" y="${H / 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#212529" transform="rotate(-90 18 ${H / 2})">${meta.label}</text>`;

    // Connecting polyline
    const polyPoints = pts.map((p) => `${xOf(p.z).toFixed(1)},${yOf(p.val).toFixed(1)}`).join(" ");
    svgHtml += `<polyline fill="none" stroke="#adb5bd" stroke-width="1.5" points="${polyPoints}"/>`;

    // Data points colored by category
    pts.forEach((p) => {
      const cx = xOf(p.z).toFixed(1);
      const cy = yOf(p.val).toFixed(1);
      const cat = DATA.categories[p.el.category];
      svgHtml += `<circle class="pt-chart-pt" cx="${cx}" cy="${cy}" r="5.5" fill="${cat.fill}" stroke="${cat.stroke}" stroke-width="2" data-z="${p.z}" data-val="${p.val}" style="cursor:pointer"/>`;
    });

    trendSvg.innerHTML = svgHtml;

    trendSvg.querySelectorAll(".pt-chart-pt").forEach((circ) => {
      circ.addEventListener("mouseenter", (e) => {
        const z = parseInt(circ.dataset.z, 10);
        const el = elementsByZ[z];
        circ.setAttribute("r", "8");
        if (chartTooltip) {
          chartTooltip.innerHTML = `<strong>${el.atomic_number} ${el.name} (${el.symbol})</strong><br>${meta.label}: <strong>${circ.dataset.val}</strong>`;
          chartTooltip.classList.remove("d-none");
        }
      });
      circ.addEventListener("mousemove", (e) => {
        if (chartTooltip) {
          const rect = trendSvg.getBoundingClientRect();
          chartTooltip.style.left = `${e.clientX - rect.left + 12}px`;
          chartTooltip.style.top = `${e.clientY - rect.top - 10}px`;
        }
      });
      circ.addEventListener("mouseleave", () => {
        circ.setAttribute("r", "5.5");
        chartTooltip?.classList.add("d-none");
      });
      circ.addEventListener("click", () => {
        const z = parseInt(circ.dataset.z, 10);
        openElementModal(z);
      });
    });
  }

  if (trendSelect) {
    renderTrendChart(trendSelect.value);
    trendSelect.addEventListener("change", (e) => renderTrendChart(e.target.value));
  }
});
