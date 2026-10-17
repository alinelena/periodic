/**
 * Interactive Periodic Table Website Logic
 * Powered by YAML element files & Bootstrap 5
 */
(function () {
  function initPeriodicApp() {
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
    const scrollWrapper = document.querySelector(".pt-scroll-wrapper");
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

    // Filter & UI state
    const state = {
      search: "",
      categories: new Set(),
      phases: new Set(),
      markers: new Set(),
      group: null,
      period: null,
      spotlight: null, // temporary hover filter { type, value }
      currentModalZ: 1,
      currentSampleEl: DATA.sample || DATA.elements[42], // Technetium default
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
      state.currentSampleEl = el;
      const isDark = document.body.classList.contains("pt-dark-theme");
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

      const zEl = document.getElementById("sample-z");
      const oxEl = document.getElementById("sample-ox");
      const massEl = document.getElementById("sample-mass");
      const ionEl = document.getElementById("sample-ion");
      const radEl = document.getElementById("sample-rad");
      const affEl = document.getElementById("sample-aff");
      const symEl = document.getElementById("sample-sym");
      const nameEl = document.getElementById("sample-name");
      const confEl = document.getElementById("sample-conf");

      if (zEl) zEl.innerHTML = `<strong>${el.atomic_number}</strong>${iconsHtml}`;
      if (oxEl) oxEl.innerHTML = formatOxHtml(el);
      if (massEl) massEl.textContent = el.atomic_mass;
      if (ionEl) ionEl.textContent = el.ionization_energy;
      if (radEl) radEl.textContent = el.atomic_radius;
      if (affEl) affEl.textContent = el.electron_affinity;
      if (symEl) symEl.textContent = el.symbol;
      if (nameEl) nameEl.textContent = el.name;
      if (confEl) confEl.innerHTML = el.electron_configuration_html;
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
        if (gridEl) gridEl.setAttribute("data-highlight-prop", prop);
        if (sampleCard) sampleCard.setAttribute("data-highlight-prop", prop);
      });
      lbl.addEventListener("mouseleave", () => {
        if (gridEl) gridEl.removeAttribute("data-highlight-prop");
        if (sampleCard) sampleCard.removeAttribute("data-highlight-prop");
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
    function setDensity(density, save = true) {
      if (gridEl) gridEl.classList.toggle("pt-compact-mode", density === "compact");
      const dDetailed = document.getElementById("pt-density-detailed");
      const dCompact = document.getElementById("pt-density-compact");
      if (dDetailed) dDetailed.checked = (density === "detailed");
      if (dCompact) dCompact.checked = (density === "compact");
      if (save) {
        try { localStorage.setItem("pt-density", density); } catch (e) {}
      }
      window.dispatchEvent(new Event("resize"));
    }

    document.querySelectorAll('input[name="pt-density"]').forEach((radio) => {
      radio.addEventListener("change", (e) => setDensity(e.target.value));
    });

    // Background Theme Toggle (Light vs Dark)
    function setBgTheme(theme, save = true) {
      const isDark = (theme === "dark");
      document.body.classList.toggle("pt-dark-theme", isDark);
      document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light");

      const tLight = document.getElementById("pt-bg-light");
      const tDark = document.getElementById("pt-bg-dark");
      if (tLight) tLight.checked = !isDark;
      if (tDark) tDark.checked = isDark;

      if (save) {
        try { localStorage.setItem("pt-theme", theme); } catch (e) {}
      }

      // Re-apply current color mode to refresh fill/stroke colors for dark/light
      if (colorModeSelect) {
        applyColorMode(colorModeSelect.value);
      }
      if (state.currentSampleEl) {
        updateSampleCard(state.currentSampleEl);
      }
      if (trendSelect) {
        renderTrendChart(trendSelect.value);
      }
    }

    document.querySelectorAll('input[name="pt-bg-theme"]').forEach((radio) => {
      radio.addEventListener("change", (e) => setBgTheme(e.target.value));
    });

    // Width Mode Toggle (Fit Screen vs Scrollable)
    function setWidthMode(mode, save = true) {
      const isScroll = (mode === "scroll");
      if (gridEl) gridEl.classList.toggle("pt-scroll-mode", isScroll);
      if (scrollWrapper) scrollWrapper.classList.toggle("pt-scroll-mode", isScroll);

      const wFit = document.getElementById("pt-width-fit");
      const wScroll = document.getElementById("pt-width-scroll");
      if (wFit) wFit.checked = !isScroll;
      if (wScroll) wScroll.checked = isScroll;

      if (save) {
        try { localStorage.setItem("pt-width-mode", mode); } catch (e) {}
      }
      window.dispatchEvent(new Event("resize"));
    }

    document.querySelectorAll('input[name="pt-width-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => setWidthMode(e.target.value));
    });

    // Also bind click handlers on labels for fast instant response
    document.querySelectorAll('label[for^="pt-"]').forEach((lbl) => {
      lbl.addEventListener("click", () => {
        const forId = lbl.getAttribute("for");
        const inp = document.getElementById(forId);
        if (inp && !inp.checked) {
          inp.checked = true;
          inp.dispatchEvent(new Event("change"));
        }
      });
    });

    // Color Mode & Heatmap Palettes
    const BLOCK_COLORS_LIGHT = {
      s: { stroke: "#98070c", fill: "#faede6" },
      p: { stroke: "#00739e", fill: "#eaf3f9" },
      d: { stroke: "#fdbe81", fill: "#fffbf7" },
      f: { stroke: "#b57fb8", fill: "#f9f7fb" },
    };

    const BLOCK_COLORS_DARK = {
      s: { stroke: "#af4833", fill: "#3b2325" },
      p: { stroke: "#008cb4", fill: "#1f3340" },
      d: { stroke: "#fece9d", fill: "#4b423c" },
      f: { stroke: "#ca9fcc", fill: "#39283c" },
    };

    const PHASE_STYLES_LIGHT = {
      solid: { stroke: "#9e5e06", fill: "#faf3ea" },
      gas: { stroke: "#6c9ed4", fill: "#f5f7fd" },
      liquid: { stroke: "#00739e", fill: "#eaf3f9" },
      unknown: { stroke: "#fdbe81", fill: "#fffbf7" },
    };

    const PHASE_STYLES_DARK = {
      solid: { stroke: "#b57d3c", fill: "#392f28" },
      gas: { stroke: "#86aedc", fill: "#202d3c" },
      liquid: { stroke: "#008cb4", fill: "#1f3340" },
      unknown: { stroke: "#fece9d", fill: "#4b423c" },
    };

    const HEATMAP_META = {
      atomic_radius_angstrom: { label: "Atomic Radius [Å]", unit: "Å" },
      ionization_energy_ev: { label: "1st Ionisation Energy [eV]", unit: "eV" },
      electron_affinity_ev: { label: "Electron Affinity [eV]", unit: "eV" },
      atomic_mass_value: { label: "Relative Atomic Mass [Da]", unit: "Da" },
    };

    function interpolateHeatmapColor(t, isDark) {
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

      if (isDark) {
        // In dark mode, tint towards dark slate for deep background contrast while keeping color identity
        const mixR = Math.round(r * 0.32 + 28 * 0.68);
        const mixG = Math.round(g * 0.32 + 32 * 0.68);
        const mixB = Math.round(b * 0.32 + 38 * 0.68);
        return {
          fill: `rgb(${mixR}, ${mixG}, ${mixB})`,
          stroke: `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`,
          text: "#f1f3f5",
        };
      } else {
        const strokeR = Math.max(0, r - 65);
        const strokeG = Math.max(0, g - 65);
        const strokeB = Math.max(0, b - 65);
        return {
          fill: `rgb(${r}, ${g}, ${b})`,
          stroke: `rgb(${strokeR}, ${strokeG}, ${strokeB})`,
          text: "#212529",
        };
      }
    }

    function applyColorMode(mode) {
      if (!gridEl) return;
      const isDark = document.body.classList.contains("pt-dark-theme");
      gridEl.dataset.colorMode = mode;

      if (mode === "category") {
        if (heatmapLegend) heatmapLegend.classList.add("d-none");
        elemNodes.forEach((node) => {
          node.style.removeProperty("--cell-stroke");
          node.style.removeProperty("--cell-fill");
          node.style.removeProperty("--cell-text");
          const valEl = node.querySelector(".pt-heatmap-val");
          if (valEl) valEl.textContent = "";
        });
      } else if (mode === "phase") {
        if (heatmapLegend) heatmapLegend.classList.add("d-none");
        const phasePalette = isDark ? PHASE_STYLES_DARK : PHASE_STYLES_LIGHT;
        elemNodes.forEach((node) => {
          const el = elementsBySym[node.dataset.symbol];
          const st = phasePalette[el.phase] || phasePalette.unknown;
          node.style.setProperty("--cell-stroke", st.stroke);
          node.style.setProperty("--cell-fill", st.fill);
          node.style.setProperty("--cell-text", isDark ? "#f1f3f5" : "#231f20");
          const valEl = node.querySelector(".pt-heatmap-val");
          if (valEl) valEl.textContent = "";
        });
      } else if (mode === "block") {
        if (heatmapLegend) heatmapLegend.classList.add("d-none");
        const blockPalette = isDark ? BLOCK_COLORS_DARK : BLOCK_COLORS_LIGHT;
        elemNodes.forEach((node) => {
          const el = elementsBySym[node.dataset.symbol];
          const st = blockPalette[el.block] || blockPalette.s;
          node.style.setProperty("--cell-stroke", st.stroke);
          node.style.setProperty("--cell-fill", st.fill);
          node.style.setProperty("--cell-text", isDark ? "#f1f3f5" : "#231f20");
          const valEl = node.querySelector(".pt-heatmap-val");
          if (valEl) valEl.textContent = `${el.block}-block`;
        });
      } else if (HEATMAP_META[mode]) {
        const meta = HEATMAP_META[mode];
        const vals = DATA.elements.map((e) => e[mode]).filter((v) => v !== null && v !== undefined);
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals);
        if (heatmapTitle) heatmapTitle.textContent = meta.label;
        if (heatmapMin) heatmapMin.textContent = `${minV} ${meta.unit}`;
        if (heatmapMax) heatmapMax.textContent = `${maxV} ${meta.unit}`;
        if (heatmapLegend) heatmapLegend.classList.remove("d-none");

        elemNodes.forEach((node) => {
          const el = elementsBySym[node.dataset.symbol];
          const val = el[mode];
          const badgeEl = node.querySelector(".pt-heatmap-val");
          if (val === null || val === undefined) {
            node.style.setProperty("--cell-stroke", isDark ? "#3b4252" : "#adb5bd");
            node.style.setProperty("--cell-fill", isDark ? "#1c2026" : "#f1f3f5");
            node.style.setProperty("--cell-text", isDark ? "#9aa5b1" : "#6c757d");
            if (badgeEl) badgeEl.textContent = "N/A";
          } else {
            const t = (val - minV) / (maxV - minV || 1);
            const col = interpolateHeatmapColor(t, isDark);
            node.style.setProperty("--cell-stroke", col.stroke);
            node.style.setProperty("--cell-fill", col.fill);
            node.style.setProperty("--cell-text", col.text);
            if (badgeEl) badgeEl.textContent = `${val} ${meta.unit}`;
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

      const isDark = document.body.classList.contains("pt-dark-theme");
      const cat = DATA.categories[el.category];
      const phaseObj = DATA.phases[el.phase] || DATA.phases.unknown;

      const zBadge = document.getElementById("modal-z-badge");
      if (zBadge) {
        zBadge.textContent = `#${el.atomic_number}`;
        zBadge.style.backgroundColor = isDark ? cat.stroke_dark : cat.stroke;
        zBadge.style.color = "#fff";
      }

      const titleEl = document.getElementById("elementModalLabel");
      if (titleEl) titleEl.textContent = `${el.name} (${el.symbol})`;

      const catBadge = document.getElementById("modal-cat-badge");
      if (catBadge) {
        catBadge.textContent = el.category_label;
        catBadge.style.backgroundColor = isDark ? cat.fill_dark : cat.fill;
        catBadge.style.color = isDark ? "#f1f3f5" : "#231f20";
        catBadge.style.border = `1.5px solid ${isDark ? cat.stroke_dark : cat.stroke}`;
      }

      // Populate modal preview card (exact clone of the element tile)
      const previewEl = document.getElementById("modal-card-preview");
      const origTile = document.getElementById(`elem-${el.symbol}`);
      if (origTile && previewEl) {
        previewEl.style.setProperty("--cat-stroke", cat.stroke);
        previewEl.style.setProperty("--cat-fill", cat.fill);
        previewEl.style.setProperty("--cat-stroke-dark", cat.stroke_dark);
        previewEl.style.setProperty("--cat-fill-dark", cat.fill_dark);
        previewEl.style.setProperty("--cell-stroke", isDark ? cat.stroke_dark : cat.stroke);
        previewEl.style.setProperty("--cell-fill", isDark ? cat.fill_dark : cat.fill);
        previewEl.style.setProperty("--cell-text", isDark ? "#f1f3f5" : "#231f20");
        previewEl.innerHTML = origTile.innerHTML;
      }

      // Status badges
      const badgesEl = document.getElementById("modal-status-badges");
      if (badgesEl) {
        let badgesHtml = `<span class="badge ${isDark ? "bg-dark text-light border-secondary" : "bg-light text-dark"} border"><span style="color:${phaseObj.color}">${phaseObj.symbol}</span> ${phaseObj.label}</span>`;
        badgesHtml += `<span class="badge ${isDark ? "bg-dark text-light border-secondary" : "bg-light text-dark"} border ms-1">${el.block}-block</span>`;
        if (el.lab_made) {
          badgesHtml += `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle ms-1">${DATA.markers.lab.symbol} Lab made</span>`;
        }
        if (el.is_radioactive) {
          badgesHtml += `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle ms-1">${DATA.markers.radioactive.symbol} Radioactive</span>`;
        }
        badgesEl.innerHTML = badgesHtml;
      }

      // Oxidation state badges
      let oxBadges = `<span class="text-muted">Unknown (U)</span>`;
      if (el.oxidation_states_parsed && el.oxidation_states_parsed.length > 0) {
        oxBadges = el.oxidation_states_parsed
          .map((item) =>
            item.common
              ? `<span class="badge bg-primary text-white me-1" title="Most common oxidation state">${item.state}</span>`
              : `<span class="badge ${isDark ? "bg-secondary text-light" : "bg-secondary-subtle text-secondary-emphasis border"} me-1">${item.state}</span>`
          )
          .join("");
      }

      // Properties table
      const propsBody = document.getElementById("modal-props-tbody");
      if (propsBody) {
        propsBody.innerHTML = `
          <tr><th class="w-40">Atomic Number (Z)</th><td class="fw-bold">${el.atomic_number}</td></tr>
          <tr><th>Symbol &amp; Name</th><td><strong>${el.symbol}</strong> — ${el.name}</td></tr>
          <tr><th>Category</th><td>${el.category_label} (<code>${el.category}</code>)</td></tr>
          <tr><th>Period &amp; Group</th><td>Period ${el.period}, Group ${el.group_label} (${el.block}-block)</td></tr>
          <tr><th>Phase @ 273 K</th><td><span style="color:${phaseObj.color}">${phaseObj.symbol}</span> ${phaseObj.label}</td></tr>
          <tr><th>Relative Atomic Mass</th><td><strong>${el.atomic_mass}</strong> Da ${el.atomic_mass_most_stable_isotope ? '<small class="text-muted">(most stable isotope)</small>' : ""}</td></tr>
          <tr><th>Oxidation States</th><td>${oxBadges} <small class="text-muted d-block mt-1">(Blue badge = most common state in periodic-table.typ)</small></td></tr>
          <tr><th>1st Ionisation Energy</th><td><strong>${el.ionization_energy}</strong> ${el.ionization_energy_ev !== null ? "eV" : ""}</td></tr>
          <tr><th>Electron Affinity</th><td><strong>${el.electron_affinity}</strong> ${el.electron_affinity_ev !== null ? "eV" : el.electron_affinity === "Ns" ? '<small class="text-muted">(Not stable)</small>' : ""}</td></tr>
          <tr><th>Atomic Radius (van der Waals)</th><td><strong>${el.atomic_radius}</strong> ${el.atomic_radius_angstrom !== null ? "Å" : ""}</td></tr>
          <tr><th>Ground State Configuration</th><td class="fs-6">${el.electron_configuration_html}</td></tr>
        `;
      }

      // Links & YAML Source
      const yamlUrl = `elements/${el.symbol}.yaml`;
      const rscLink = document.getElementById("modal-rsc-link");
      const yamlLink = document.getElementById("modal-yaml-link");
      const yamlFilename = document.getElementById("modal-yaml-filename");
      if (rscLink) rscLink.href = el.rsc_url;
      if (yamlLink) yamlLink.href = yamlUrl;
      if (yamlFilename) yamlFilename.textContent = `${el.symbol}.yaml`;

      const yamlCodeEl = document.getElementById("modal-yaml-code");
      if (yamlCodeEl) yamlCodeEl.textContent = DATA.rawYaml[el.symbol] || "";

      // Also fetch live YAML file in case it was updated on server
      fetch(yamlUrl)
        .then((res) => (res.ok ? res.text() : null))
        .then((txt) => {
          if (txt && state.currentModalZ === z && yamlCodeEl) {
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
      const isDark = document.body.classList.contains("pt-dark-theme");
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

      const gridStroke = isDark ? "#323846" : "#dee2e6";
      const tickStroke = isDark ? "#2b313c" : "#e9ecef";
      const axisTextFill = isDark ? "#9aa5b1" : "#6c757d";
      const axisHdrFill = isDark ? "#f1f3f5" : "#212529";
      const polyStroke = isDark ? "#6c757d" : "#adb5bd";

      let svgHtml = "";

      // Horizontal grid lines
      const yTicks = 6;
      for (let i = 0; i <= yTicks; i++) {
        const v = minY + ((maxY - minY) * i) / yTicks;
        const y = yOf(v);
        svgHtml += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${gridStroke}" stroke-dasharray="4 4"/>`;
        svgHtml += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${axisTextFill}">${v.toFixed(1)}</text>`;
      }

      // X-axis ticks (Noble gases + 1)
      [1, 2, 10, 18, 36, 54, 86, 118].forEach((z) => {
        const x = xOf(z);
        const sym = elementsByZ[z].symbol;
        svgHtml += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="${tickStroke}"/>`;
        svgHtml += `<text x="${x}" y="${H - padB + 18}" text-anchor="middle" font-size="11" fill="${axisTextFill}">${z} (${sym})</text>`;
      });

      // Axes labels
      svgHtml += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="13" font-weight="bold" fill="${axisHdrFill}">Atomic Number (Z)</text>`;
      svgHtml += `<text x="18" y="${H / 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="${axisHdrFill}" transform="rotate(-90 18 ${H / 2})">${meta.label}</text>`;

      // Connecting polyline
      const polyPoints = pts.map((p) => `${xOf(p.z).toFixed(1)},${yOf(p.val).toFixed(1)}`).join(" ");
      svgHtml += `<polyline fill="none" stroke="${polyStroke}" stroke-width="1.5" points="${polyPoints}"/>`;

      // Data points colored by category
      pts.forEach((p) => {
        const cx = xOf(p.z).toFixed(1);
        const cy = yOf(p.val).toFixed(1);
        const cat = DATA.categories[p.el.category];
        const fill = isDark ? (cat.fill_dark || cat.fill) : cat.fill;
        const stroke = isDark ? (cat.stroke_dark || cat.stroke) : cat.stroke;
        svgHtml += `<circle class="pt-chart-pt" cx="${cx}" cy="${cy}" r="5.5" fill="${fill}" stroke="${stroke}" stroke-width="2" data-z="${p.z}" data-val="${p.val}" style="cursor:pointer"/>`;
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

    // Restore saved settings or apply initial defaults
    let initialTheme = "light";
    let initialWidth = "fit";
    let initialDensity = "detailed";
    try {
      initialTheme = localStorage.getItem("pt-theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      initialWidth = localStorage.getItem("pt-width-mode") || "fit";
      initialDensity = localStorage.getItem("pt-density") || "detailed";
    } catch (e) {}

    setBgTheme(initialTheme, false);
    setWidthMode(initialWidth, false);
    setDensity(initialDensity, false);
    applyColorMode(colorModeSelect ? colorModeSelect.value : "category");
    updateSampleCard(state.currentSampleEl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPeriodicApp);
  } else {
    initPeriodicApp();
  }
})();
