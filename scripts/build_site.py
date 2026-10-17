#!/usr/bin/env python3
"""Build interactive periodic table HTML snippet from YAML files in elements/."""

from __future__ import annotations

import html
import json
import pathlib
import yaml


ROOT = pathlib.Path(__file__).resolve().parent.parent
ELEMENTS_DIR = ROOT / "elements"
INCLUDES_DIR = ROOT / "_includes"


def format_ox_html(ox_parsed: list[dict], ox_raw: str) -> str:
    if not ox_parsed:
        return html.escape(ox_raw)
    parts = []
    for item in ox_parsed:
        st = html.escape(str(item["state"]))
        if item.get("common"):
            parts.append(f"<strong>{st}</strong>")
        else:
            parts.append(st)
    return " ".join(parts)


def render_phase_icon(phase: str, phases_meta: dict) -> str:
    p = phases_meta.get(phase, phases_meta["unknown"])
    sym = p["symbol"]
    col = p["color"]
    lbl = html.escape(p["label"])
    return f'<span class="pt-phase-icon" style="color:{col}" title="{lbl}">{sym}</span>'


def render_markers(elem: dict, markers_meta: dict) -> str:
    icons = []
    if elem.get("lab_made"):
        m = markers_meta["lab"]
        icons.append(
            f'<span class="pt-marker-icon" style="color:{m["color"]}" title="{html.escape(m["label"])}">{m["symbol"]}</span>'
        )
    if elem.get("radioactive_marker"):
        m = markers_meta["radioactive"]
        icons.append(
            f'<span class="pt-marker-icon" style="color:{m["color"]}" title="{html.escape(m["label"])}">{m["symbol"]}</span>'
        )
    return "".join(icons)


def render_element_tile(elem: dict, categories_meta: dict) -> str:
    z = elem["atomic_number"]
    sym = elem["symbol"]
    name = elem["name"]
    cat = elem["category"]
    cat_info = categories_meta["categories"][cat]
    phase = elem["phase"]
    row = elem["grid_row"]
    col = elem["grid_col"]
    period = elem["period"]
    group = elem["group"] if elem["group"] is not None else ""
    block = elem["block"]
    lab = "true" if elem.get("lab_made") else "false"
    radio = "true" if (elem.get("radioactive_marker") or elem.get("is_radioactive")) else "false"
    radio_card = "true" if elem.get("radioactive_marker") else "false"

    phase_html = render_phase_icon(phase, categories_meta["phases"])
    markers_html = render_markers(elem, categories_meta["markers"])
    ox_html = format_ox_html(elem.get("oxidation_states_parsed", []), elem.get("oxidation_states", ""))
    mass = html.escape(str(elem.get("atomic_mass", "")))
    ion = html.escape(str(elem.get("ionization_energy", "")))
    rad = html.escape(str(elem.get("atomic_radius", "")))
    aff = html.escape(str(elem.get("electron_affinity", "")))
    conf_html = elem.get("electron_configuration_html", "")

    return f"""<div class="pt-cell pt-elem"
  id="elem-{sym}"
  style="grid-row: {row}; grid-column: {col}; --cat-stroke: {cat_info['stroke']}; --cat-fill: {cat_info['fill']}; --cat-stroke-dark: {cat_info['stroke_dark']}; --cat-fill-dark: {cat_info['fill_dark']};"
  data-z="{z}"
  data-symbol="{html.escape(sym)}"
  data-name="{html.escape(name)}"
  data-category="{html.escape(cat)}"
  data-phase="{html.escape(phase)}"
  data-period="{period}"
  data-group="{group}"
  data-block="{html.escape(block)}"
  data-lab="{lab}"
  data-radio="{radio}"
  data-radio-card="{radio_card}"
  role="button"
  tabindex="0"
  aria-label="{z} {html.escape(name)} ({html.escape(sym)})">
  <div class="pt-row pt-row-top" data-prop="top">
    <span class="pt-z" data-prop="z"><strong>{z}</strong>{phase_html}{markers_html}</span>
    <span class="pt-ox" data-prop="ox">{ox_html}</span>
  </div>
  <div class="pt-row pt-row-mid1" data-prop="mid1">
    <span class="pt-mass" data-prop="mass">{mass}</span>
    <span class="pt-ion" data-prop="ion">{ion}</span>
  </div>
  <div class="pt-row pt-row-mid2" data-prop="mid2">
    <span class="pt-rad" data-prop="rad">{rad}</span>
    <span class="pt-aff" data-prop="aff">{aff}</span>
  </div>
  <div class="pt-sym" data-prop="sym">{html.escape(sym)}</div>
  <div class="pt-name" data-prop="name">{html.escape(name)}</div>
  <div class="pt-conf" data-prop="conf">{conf_html}</div>
  <div class="pt-heatmap-val"></div>
</div>"""


def main() -> None:
    INCLUDES_DIR.mkdir(parents=True, exist_ok=True)
    with open(ELEMENTS_DIR / "categories.yaml", "r", encoding="utf-8") as f:
        categories_meta = yaml.safe_load(f)

    elements = []
    raw_yaml_by_sym = {}
    for p in sorted(ELEMENTS_DIR.glob("*.yaml")):
        if p.name == "categories.yaml":
            continue
        raw_text = p.read_text(encoding="utf-8")
        data = yaml.safe_load(raw_text)
        elements.append(data)
        raw_yaml_by_sym[data["symbol"]] = raw_text

    elements.sort(key=lambda e: e["atomic_number"])
    assert len(elements) == 118, f"Expected 118 elements, found {len(elements)}"

    grid_items = []

    # Corner Group / Period indicator
    grid_items.append(
        '<div class="pt-axis-corner" style="grid-row: 1; grid-column: 1;" title="Click a Group or Period number to highlight it">'
        '<span class="pt-axis-group">Group →</span>'
        '<span class="pt-axis-period">↓ Period</span>'
        "</div>"
    )

    # Group headers
    for g in categories_meta["groups"]:
        g_num = g["number"]
        g_lbl = g["label"]
        parts = g_lbl.split(" ", 1)
        num_str = parts[0]
        roman_str = parts[1] if len(parts) > 1 else ""
        grid_items.append(
            f'<button type="button" class="pt-group-hdr" style="grid-row: 1; grid-column: {g_num + 1};" '
            f'data-group-filter="{g_num}" title="Filter Group {g_lbl}">'
            f'<span class="fw-bold">{num_str}</span> <span class="pt-group-roman">{roman_str}</span>'
            f"</button>"
        )

    # Period headers (1..7)
    for p_num in range(1, 8):
        grid_items.append(
            f'<button type="button" class="pt-period-hdr" style="grid-row: {p_num + 1}; grid-column: 1;" '
            f'data-period-filter="{p_num}" title="Filter Period {p_num}">'
            f"{p_num}"
            f"</button>"
        )

    # F-block row labels
    grid_items.append(
        '<button type="button" class="pt-fblock-hdr" style="grid-row: 10; grid-column: 2 / span 3;" '
        'data-category-filter="Lanthanide" title="Highlight Lanthanides (57–71)">'
        '57–71 <strong>Lanthanides</strong>'
        "</button>"
    )
    grid_items.append(
        '<button type="button" class="pt-fblock-hdr" style="grid-row: 11; grid-column: 2 / span 3;" '
        'data-category-filter="Actinide" title="Highlight Actinides (89–103)">'
        '89–103 <strong>Actinides</strong>'
        "</button>"
    )

    # Placeholder cards in Period 6 & 7 Group 3 (La-Lu and Ac-Lr, matching periodic-table.typ)
    lan_cat = categories_meta["categories"]["Lanthanide"]
    act_cat = categories_meta["categories"]["Actinide"]
    grid_items.append(
        f"""<div class="pt-cell pt-placeholder"
  style="grid-row: 7; grid-column: 4; --cat-stroke: {lan_cat['stroke']}; --cat-fill: {lan_cat['fill']}; --cat-stroke-dark: {lan_cat['stroke_dark']}; --cat-fill-dark: {lan_cat['fill_dark']};"
  data-category="Lanthanide"
  data-category-filter="Lanthanide"
  role="button"
  tabindex="0"
  title="Click to highlight Lanthanides (57–71)">
  <div class="pt-row pt-row-top"><span class="pt-z"><strong>57-71</strong></span></div>
  <div class="pt-sym">La-Lu</div>
  <div class="pt-name">Lanthanide</div>
</div>"""
    )
    grid_items.append(
        f"""<div class="pt-cell pt-placeholder"
  style="grid-row: 8; grid-column: 4; --cat-stroke: {act_cat['stroke']}; --cat-fill: {act_cat['fill']}; --cat-stroke-dark: {act_cat['stroke_dark']}; --cat-fill-dark: {act_cat['fill_dark']};"
  data-category="Actinide"
  data-category-filter="Actinide"
  role="button"
  tabindex="0"
  title="Click to highlight Actinides (89–103)">
  <div class="pt-row pt-row-top"><span class="pt-z"><strong>89-103</strong></span></div>
  <div class="pt-sym">Ac-Lr</div>
  <div class="pt-name">Actinide</div>
</div>"""
    )

    # Render all 118 element tiles (shifting grid_row and grid_col for headers)
    for elem in elements:
        elem_copy = dict(elem)
        if elem["grid_row"] <= 7:
            elem_copy["grid_row"] = elem["grid_row"] + 1
        else:
            # 9 -> 10 (Lanthanides), 10 -> 11 (Actinides)
            elem_copy["grid_row"] = elem["grid_row"] + 1
        elem_copy["grid_col"] = elem["grid_col"] + 1
        grid_items.append(render_element_tile(elem_copy, categories_meta))

    # Category filter legend boxes (matching periodic-table.typ)
    cat_buttons = []
    for cat_id, cat_info in categories_meta["categories"].items():
        count = sum(1 for e in elements if e["category"] == cat_id)
        cat_buttons.append(
            f'<button type="button" class="pt-cat-box" data-category-filter="{cat_id}" '
            f'style="--cat-stroke: {cat_info["stroke"]}; --cat-fill: {cat_info["fill"]}; --cat-stroke-dark: {cat_info["stroke_dark"]}; --cat-fill-dark: {cat_info["fill_dark"]};">'
            f'<span class="pt-cat-label">{html.escape(cat_info["label"])}</span>'
            f'<span class="pt-cat-count badge rounded-pill">{count}</span>'
            f"</button>"
        )

    # Phase & Marker legend buttons (matching periodic-table.typ)
    phase_buttons = []
    for ph_id, ph_info in categories_meta["phases"].items():
        count = sum(1 for e in elements if e["phase"] == ph_id)
        phase_buttons.append(
            f'<button type="button" class="btn btn-sm pt-state-btn" data-phase-filter="{ph_id}">'
            f'<span class="pt-state-sym" style="color: {ph_info["color"]}">{ph_info["symbol"]}</span> '
            f'<span>{html.escape(ph_info["label"])}</span> '
            f'<span class="badge bg-secondary-subtle text-secondary-emphasis ms-1">{count}</span>'
            f"</button>"
        )

    marker_buttons = []
    lab_count = sum(1 for e in elements if e.get("lab_made"))
    radio_count = sum(1 for e in elements if e.get("is_radioactive"))
    m_radio = categories_meta["markers"]["radioactive"]
    m_lab = categories_meta["markers"]["lab"]
    marker_buttons.append(
        f'<button type="button" class="btn btn-sm pt-state-btn" data-marker-filter="radio">'
        f'<span class="pt-state-sym" style="color: {m_radio["color"]}">{m_radio["symbol"]}</span> '
        f'<span>{html.escape(m_radio["label"])}</span> '
        f'<span class="badge bg-secondary-subtle text-secondary-emphasis ms-1">{radio_count}</span>'
        f"</button>"
    )
    marker_buttons.append(
        f'<button type="button" class="btn btn-sm pt-state-btn" data-marker-filter="lab">'
        f'<span class="pt-state-sym" style="color: {m_lab["color"]}">{m_lab["symbol"]}</span> '
        f'<span>{html.escape(m_lab["label"])}</span> '
        f'<span class="badge bg-secondary-subtle text-secondary-emphasis ms-1">{lab_count}</span>'
        f"</button>"
    )

    # Table rows for Tab 3 (Sortable Data Table & YAML Explorer)
    table_rows = []
    for e in elements:
        z = e["atomic_number"]
        sym = e["symbol"]
        name = e["name"]
        cat = e["category"]
        cat_info = categories_meta["categories"][cat]
        ph_info = categories_meta["phases"][e["phase"]]
        ox_html = format_ox_html(e.get("oxidation_states_parsed", []), e.get("oxidation_states", ""))
        table_rows.append(
            f"""<tr class="pt-table-row" data-z="{z}" data-symbol="{html.escape(sym)}" role="button">
  <td class="fw-bold">{z}</td>
  <td><span class="badge pt-sym-badge" style="background:{cat_info['fill']}; color:#231f20; border:1.5px solid {cat_info['stroke']}">{html.escape(sym)}</span></td>
  <td class="fw-semibold">{html.escape(name)}</td>
  <td><span class="badge" style="background:{cat_info['fill']}; color:#231f20; border:1px solid {cat_info['stroke']}">{html.escape(e['category_label'])}</span></td>
  <td class="d-none d-lg-table-cell">{e['period']}</td>
  <td class="d-none d-lg-table-cell">{html.escape(str(e['group'] or 'f-block'))}</td>
  <td class="d-none d-md-table-cell"><span style="color:{ph_info['color']}">{ph_info['symbol']}</span> {html.escape(ph_info['label'])}</td>
  <td>{html.escape(str(e['atomic_mass']))}</td>
  <td class="d-none d-md-table-cell">{ox_html}</td>
  <td class="d-none d-md-table-cell">{html.escape(str(e['ionization_energy']))}</td>
  <td class="d-none d-lg-table-cell">{html.escape(str(e['atomic_radius']))}</td>
  <td class="d-none d-lg-table-cell">{html.escape(str(e['electron_affinity']))}</td>
  <td class="d-none d-xl-table-cell">{e['electron_configuration_html']}</td>
  <td class="text-nowrap" onclick="event.stopPropagation();">
    <a href="elements/{html.escape(sym)}.yaml" class="btn btn-xs btn-outline-primary py-0 px-2" target="_blank" title="View {html.escape(sym)}.yaml">YAML</a>
    <a href="{html.escape(e['rsc_url'])}" class="btn btn-xs btn-outline-secondary py-0 px-2" target="_blank" rel="noopener" title="RSC Page">RSC ↗</a>
  </td>
</tr>"""
        )

    payload_json = json.dumps(
        {
            "categories": categories_meta["categories"],
            "phases": categories_meta["phases"],
            "markers": categories_meta["markers"],
            "sample": categories_meta["sample_element"],
            "elements": elements,
            "rawYaml": raw_yaml_by_sym,
        },
        ensure_ascii=False,
    )

    tc_cat = categories_meta["categories"]["TransMetal"]

    app_html = f"""<!-- Generated from elements/*.yaml by scripts/build_site.py -->
<div class="pt-app-container container-fluid px-1 px-sm-2 px-md-3 py-2">

  <!-- Top Controls & Interactive Legend Banner -->
  <div class="card shadow-sm border-0 mb-3 pt-top-panel">
    <div class="card-body p-2 p-md-3">
      <div class="row g-3 align-items-center">

        <!-- Left: Enlarged Sample Element Callout (matching periodic-table.typ Technetium legend) -->
        <div class="col-12 col-xl-5">
          <div class="pt-sample-wrapper d-flex align-items-center justify-content-center gap-2">
            <div class="pt-callout-left text-end">
              <div class="pt-callout-item" data-highlight-prop="z"><strong>atomic number</strong></div>
              <div class="pt-callout-item" data-highlight-prop="mass"><strong>relative atomic mass [Da]</strong></div>
              <div class="pt-callout-item" data-highlight-prop="rad"><strong>atomic radius [Å]</strong></div>
              <div class="pt-callout-spacer"></div>
            </div>

            <div id="pt-sample-card" class="pt-cell pt-sample-elem"
                 style="--cat-stroke: {tc_cat['stroke']}; --cat-fill: {tc_cat['fill']}; --cat-stroke-dark: {tc_cat['stroke_dark']}; --cat-fill-dark: {tc_cat['fill_dark']};"
                 data-symbol="Tc" role="button" title="Click to inspect element details">
              <div class="pt-row pt-row-top">
                <span class="pt-z" id="sample-z"><strong>43</strong><span class="pt-phase-icon" style="color:#9e5e06">⬛</span><span class="pt-marker-icon" style="color:#00ae61">⚗</span><span class="pt-marker-icon" style="color:#f58a91">☢</span></span>
                <span class="pt-ox" id="sample-ox"><strong>7</strong></span>
              </div>
              <div class="pt-row pt-row-mid1">
                <span class="pt-mass" id="sample-mass">[98]</span>
                <span class="pt-ion" id="sample-ion">7.1194</span>
              </div>
              <div class="pt-row pt-row-mid2">
                <span class="pt-rad" id="sample-rad">2.16</span>
                <span class="pt-aff" id="sample-aff">0.55</span>
              </div>
              <div class="pt-sym" id="sample-sym">Tc</div>
              <div class="pt-name" id="sample-name">Technetium</div>
              <div class="pt-conf" id="sample-conf">[Kr]4d<sup>5</sup>5s<sup>2</sup></div>
            </div>

            <div class="pt-callout-right text-start">
              <div class="pt-callout-item" data-highlight-prop="ox">oxidation states</div>
              <div class="pt-callout-item" data-highlight-prop="ion"><strong>1st ionisation energy [eV]</strong></div>
              <div class="pt-callout-item" data-highlight-prop="aff"><strong>affinity [eV]</strong></div>
              <div class="pt-callout-item pt-callout-sym" data-highlight-prop="sym"><strong>symbol</strong></div>
              <div class="pt-callout-item" data-highlight-prop="name"><strong>name</strong></div>
              <div class="pt-callout-item" data-highlight-prop="conf">ground state configuration</div>
            </div>
          </div>
          <div class="text-center mt-1">
            <small class="text-muted">Hover any element to preview in the legend card, or click for full YAML &amp; properties</small>
          </div>
        </div>

        <!-- Middle: State @ 273K & Radioactive/Lab Filters -->
        <div class="col-12 col-md-5 col-xl-3">
          <div class="fw-semibold small text-uppercase text-muted mb-1">Phase @ 273 K &amp; Properties</div>
          <div class="d-flex flex-wrap gap-1 mb-2">
            {"".join(phase_buttons)}
          </div>
          <div class="d-flex flex-wrap gap-1">
            {"".join(marker_buttons)}
          </div>
        </div>

        <!-- Right: Category Legend Grid -->
        <div class="col-12 col-md-7 col-xl-4">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-semibold small text-uppercase text-muted">Element Categories</span>
            <button type="button" id="pt-reset-btn" class="btn btn-xs btn-outline-secondary py-0 px-2 d-none">Reset Filters</button>
          </div>
          <div class="pt-cat-grid">
            {"".join(cat_buttons)}
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Search, View Tabs & Heatmap Toolbar -->
  <div class="card shadow-sm border-0 mb-3 pt-toolbar-card">
    <div class="card-body py-2 px-3">
      <div class="row g-2 align-items-center justify-content-between">

        <!-- Navigation Tabs -->
        <div class="col-12 col-lg-auto">
          <ul class="nav nav-pills nav-fill gap-1" id="ptViewTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active py-1 px-3 fw-semibold" id="tab-grid-btn" data-bs-toggle="tab" data-bs-target="#pane-grid" type="button" role="tab">
                Periodic Table
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link py-1 px-3 fw-semibold" id="tab-trends-btn" data-bs-toggle="tab" data-bs-target="#pane-trends" type="button" role="tab">
                Property Trends
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link py-1 px-3 fw-semibold" id="tab-table-btn" data-bs-toggle="tab" data-bs-target="#pane-table" type="button" role="tab">
                Data &amp; YAML Explorer
              </button>
            </li>
          </ul>
        </div>

        <!-- Search Input -->
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-body-tertiary">🔍</span>
            <input type="search" id="pt-search-input" class="form-control" placeholder="Search symbol, name, Z, config (press /)..." aria-label="Search elements">
            <span class="input-group-text bg-body-tertiary text-muted" id="pt-match-count">118 / 118</span>
          </div>
        </div>

        <!-- Color Mode / Heatmap, Density, Width & Background Theme Controls -->
        <div class="col-12 col-sm-6 col-lg-auto d-flex flex-wrap align-items-center gap-2">
          <div class="input-group input-group-sm" style="width: auto;">
            <label class="input-group-text bg-body-tertiary" for="pt-color-mode">Color by</label>
            <select class="form-select form-select-sm" id="pt-color-mode" style="max-width: 205px;">
              <option value="category" selected>Category (Typst Default)</option>
              <option value="phase">Phase @ 273 K</option>
              <option value="block">Electronic Block (s, p, d, f)</option>
              <option value="atomic_radius_angstrom">Atomic Radius [Å]</option>
              <option value="ionization_energy_ev">1st Ionisation Energy [eV]</option>
              <option value="electron_affinity_ev">Electron Affinity [eV]</option>
              <option value="atomic_mass_value">Relative Atomic Mass [Da]</option>
            </select>
          </div>

          <div class="btn-group btn-group-sm" role="group" aria-label="Card density">
            <input type="radio" class="btn-check" name="pt-density" id="pt-density-detailed" value="detailed" autocomplete="off" checked>
            <label class="btn btn-outline-secondary" for="pt-density-detailed">Detailed</label>
            <input type="radio" class="btn-check" name="pt-density" id="pt-density-compact" value="compact" autocomplete="off">
            <label class="btn btn-outline-secondary" for="pt-density-compact">Compact</label>
          </div>

          <div class="btn-group btn-group-sm" role="group" aria-label="Width fit">
            <input type="radio" class="btn-check" name="pt-width-mode" id="pt-width-fit" value="fit" autocomplete="off" checked>
            <label class="btn btn-outline-secondary" for="pt-width-fit" title="Fit table to screen width">Fit Screen</label>
            <input type="radio" class="btn-check" name="pt-width-mode" id="pt-width-scroll" value="scroll" autocomplete="off">
            <label class="btn btn-outline-secondary" for="pt-width-scroll" title="Allow horizontal scroll">Scroll</label>
          </div>

          <div class="btn-group btn-group-sm" role="group" aria-label="Background theme">
            <input type="radio" class="btn-check" name="pt-bg-theme" id="pt-bg-light" value="light" autocomplete="off" checked>
            <label class="btn btn-outline-secondary" for="pt-bg-light" title="Light background">☀️ Light</label>
            <input type="radio" class="btn-check" name="pt-bg-theme" id="pt-bg-dark" value="dark" autocomplete="off">
            <label class="btn btn-outline-secondary" for="pt-bg-dark" title="Dark background">🌙 Dark</label>
          </div>
        </div>

      </div>

      <!-- Continuous Heatmap Legend Bar (shown when numeric property selected) -->
      <div id="pt-heatmap-legend" class="mt-2 pt-2 border-top d-none">
        <div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">
          <span id="pt-heatmap-title" class="fw-semibold small"></span>
          <div class="d-flex align-items-center gap-2">
            <span id="pt-heatmap-min" class="small font-monospace"></span>
            <div class="pt-gradient-bar"></div>
            <span id="pt-heatmap-max" class="small font-monospace"></span>
          </div>
          <span class="small text-muted">(Grey = Unknown / Not stable)</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Tab Content Panes -->
  <div class="tab-content" id="ptViewTabsContent">

    <!-- PANE 1: Interactive 18-Column Periodic Table Grid -->
    <div class="tab-pane fade show active" id="pane-grid" role="tabpanel" aria-labelledby="tab-grid-btn">
      <div class="pt-scroll-wrapper">
        <div class="pt-grid" id="pt-main-grid">
          {"".join(grid_items)}
        </div>
      </div>

      <!-- Downloads & Footer matching periodic-table.typ -->
      <div class="card shadow-sm border-0 mt-3 pt-footer-card">
        <div class="card-body py-2 px-3">
          <div class="row g-2 align-items-center justify-content-between">
            <div class="col-12 col-xl-auto">
              <div class="d-flex flex-wrap align-items-center gap-1">
                <span class="fw-semibold small me-1">☀️ Light Background PDF/SVG:</span>
                <a href="downloads/periodic-table-a0-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A0</a>
                <a href="downloads/periodic-table-a1-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A1</a>
                <a href="downloads/periodic-table-a2-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A2</a>
                <a href="downloads/periodic-table-a3-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A3</a>
                <a href="downloads/periodic-table-a4-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A4</a>
                <a href="downloads/periodic-table-a5-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">A5</a>
                <a href="downloads/periodic-table-auto-light.pdf" class="btn btn-xs btn-outline-secondary" target="_blank">Auto PDF</a>
                <a href="downloads/periodic-table-light.svg" class="btn btn-xs btn-outline-secondary" target="_blank">SVG</a>
              </div>
            </div>
            <div class="col-12 col-xl-auto">
              <div class="d-flex flex-wrap align-items-center gap-1">
                <span class="fw-semibold small me-1">🌙 Dark Background PDF/SVG:</span>
                <a href="downloads/periodic-table-a0-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A0</a>
                <a href="downloads/periodic-table-a1-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A1</a>
                <a href="downloads/periodic-table-a2-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A2</a>
                <a href="downloads/periodic-table-a3-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A3</a>
                <a href="downloads/periodic-table-a4-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A4</a>
                <a href="downloads/periodic-table-a5-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">A5</a>
                <a href="downloads/periodic-table-auto-dark.pdf" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">Auto PDF</a>
                <a href="downloads/periodic-table-dark.svg" class="btn btn-xs btn-outline-dark pt-dark-dl-btn" target="_blank">SVG</a>
              </div>
            </div>
          </div>
          <div class="d-flex flex-wrap justify-content-between align-items-center mt-2 pt-2 border-top text-muted small">
            <div>
              More info: <a href="https://www.rsc.org/periodic-table" target="_blank" rel="noopener">RSC Periodic Table</a>
              &nbsp;|&nbsp;
              Source &amp; raw YAML data: <a href="https://github.com/alinelena/periodic" target="_blank" rel="noopener">github.com/alinelena/periodic</a>
              &amp; <a href="https://gitlab.com/drFaustroll/periodic" target="_blank" rel="noopener">gitlab.com/drFaustroll/periodic</a>
            </div>
            <div>
              <a href="elements/categories.yaml" class="btn btn-xs btn-outline-secondary" target="_blank">⬇ categories.yaml</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PANE 2: Interactive Property Trends Chart -->
    <div class="tab-pane fade" id="pane-trends" role="tabpanel" aria-labelledby="tab-trends-btn">
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h5 class="mb-0 fw-bold">Periodic Trends Across Atomic Number (Z = 1–118)</h5>
            <div class="d-flex align-items-center gap-2">
              <label for="pt-trend-select" class="small fw-semibold text-nowrap mb-0">Plot Property:</label>
              <select id="pt-trend-select" class="form-select form-select-sm" style="width: 240px;">
                <option value="ionization_energy_ev" selected>1st Ionisation Energy [eV]</option>
                <option value="atomic_radius_angstrom">Atomic Radius [Å]</option>
                <option value="electron_affinity_ev">Electron Affinity [eV]</option>
                <option value="atomic_mass_value">Relative Atomic Mass [Da]</option>
              </select>
            </div>
          </div>
          <div id="pt-trend-chart-container" class="w-100" style="min-height: 440px; position: relative;">
            <svg id="pt-trend-svg" viewBox="0 0 1000 420" class="w-100 h-auto border rounded bg-body-tertiary"></svg>
            <div id="pt-chart-tooltip" class="pt-chart-tooltip d-none"></div>
          </div>
          <p class="text-muted small mt-2 mb-0">
            Click any point on the curve to open the full element modal and inspect its YAML file. Points are colored by their element category from <code>periodic-table.typ</code>.
          </p>
        </div>
      </div>
    </div>

    <!-- PANE 3: Data Table & YAML Explorer -->
    <div class="tab-pane fade" id="pane-table" role="tabpanel" aria-labelledby="tab-table-btn">
      <div class="card shadow-sm border-0">
        <div class="card-body p-0">
          <div class="table-responsive" style="max-height: 75vh;">
            <table class="table table-hover table-sm align-middle mb-0" id="pt-data-table" data-quarto-disable-processing="true">
              <thead class="table-light sticky-top">
                <tr>
                  <th data-sort="atomic_number" role="button">Z ↕</th>
                  <th data-sort="symbol" role="button">Sym ↕</th>
                  <th data-sort="name" role="button">Name ↕</th>
                  <th data-sort="category_label" role="button">Category ↕</th>
                  <th data-sort="period" class="d-none d-lg-table-cell" role="button">Period ↕</th>
                  <th data-sort="group" class="d-none d-lg-table-cell" role="button">Group ↕</th>
                  <th data-sort="phase" class="d-none d-md-table-cell" role="button">Phase @ 273K ↕</th>
                  <th data-sort="atomic_mass_value" role="button">Mass [Da] ↕</th>
                  <th class="d-none d-md-table-cell">Oxidation States</th>
                  <th data-sort="ionization_energy_ev" class="d-none d-md-table-cell" role="button">1st IE [eV] ↕</th>
                  <th data-sort="atomic_radius_angstrom" class="d-none d-lg-table-cell" role="button">Radius [Å] ↕</th>
                  <th data-sort="electron_affinity_ev" class="d-none d-lg-table-cell" role="button">Affinity [eV] ↕</th>
                  <th class="d-none d-xl-table-cell">Configuration</th>
                  <th>Files &amp; Links</th>
                </tr>
              </thead>
              <tbody id="pt-table-body">
                {"".join(table_rows)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- Element Detail Modal (Bootstrap 5) -->
<div class="modal fade" id="elementModal" tabindex="-1" aria-labelledby="elementModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content border-0 shadow-lg">
      <div class="modal-header py-2 px-3" id="modal-header-bar">
        <div class="d-flex align-items-center gap-2">
          <span class="badge fs-6" id="modal-z-badge">#1</span>
          <h5 class="modal-title fw-bold mb-0" id="elementModalLabel">Hydrogen (H)</h5>
          <span class="badge" id="modal-cat-badge">Non metal</span>
        </div>
        <div class="d-flex align-items-center gap-1 ms-auto me-2">
          <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" id="modal-prev-btn" title="Previous Element (←)">← Prev</button>
          <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" id="modal-next-btn" title="Next Element (→)">Next →</button>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>

      <div class="modal-body p-3">
        <div class="row g-3 align-items-start">
          <!-- Left column: Typst-style card + quick badges -->
          <div class="col-12 col-md-4 d-flex flex-column align-items-center">
            <div id="modal-card-preview" class="pt-cell pt-modal-elem mb-3"></div>
            <div id="modal-status-badges" class="d-flex flex-wrap justify-content-center gap-1 mb-2"></div>
            <div class="d-grid gap-2 w-100 mt-1">
              <a id="modal-rsc-link" href="#" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">
                Royal Society of Chemistry ↗
              </a>
              <div class="btn-group btn-group-sm">
                <a id="modal-yaml-link" href="#" target="_blank" class="btn btn-outline-secondary">
                  Open YAML File
                </a>
                <button type="button" id="modal-copy-yaml-btn" class="btn btn-outline-secondary">
                  Copy YAML
                </button>
              </div>
            </div>
          </div>

          <!-- Right column: Detailed properties & YAML source tabs -->
          <div class="col-12 col-md-8">
            <ul class="nav nav-tabs nav-tabs-sm mb-2" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active py-1 px-3 fw-semibold" data-bs-toggle="tab" data-bs-target="#modal-pane-props" type="button" role="tab">
                  Properties
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link py-1 px-3 fw-semibold" data-bs-toggle="tab" data-bs-target="#modal-pane-yaml" type="button" role="tab">
                  YAML Source (<code id="modal-yaml-filename">H.yaml</code>)
                </button>
              </li>
            </ul>

            <div class="tab-content">
              <div class="tab-pane fade show active" id="modal-pane-props" role="tabpanel">
                <table class="table table-sm table-striped mb-0" data-quarto-disable-processing="true">
                  <tbody id="modal-props-tbody"></tbody>
                </table>
              </div>
              <div class="tab-pane fade" id="modal-pane-yaml" role="tabpanel">
                <pre class="bg-body-tertiary p-2 rounded border small mb-0" style="max-height: 340px; overflow: auto;"><code id="modal-yaml-code"></code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script id="pt-data-json" type="application/json">{payload_json}</script>
"""

    (INCLUDES_DIR / "periodic-app.html").write_text(app_html, encoding="utf-8")
    print(f"Generated {INCLUDES_DIR / 'periodic-app.html'} ({len(app_html)} bytes)")


if __name__ == "__main__":
    main()
