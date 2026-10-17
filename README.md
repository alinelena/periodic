# Periodic Table of Elements

Interactive Periodic Table website and printable Typst poster, published at **[periodic.elena.re](https://periodic.elena.re)**.

## Features

- **Interactive Periodic Table (Quarto + Bootstrap 5)**:
  - Styled with the exact category color palette and element card layout from [`periodic-table.typ`](periodic-table.typ).
  - **Enlarged Sample Element Callout** (`43 Tc`) that updates live on hover and highlights corresponding properties across all 118 elements when hovering callout labels.
  - **Interactive Filters & Spotlights**: filter or spotlight by element category, phase at 273 K (`⬛ solid`, `⬤ gas`, `▲ liquid`, `◆ unknown`), radioactivity (`☢`), synthetic/lab-made status (`⚗`), group (`1 IA` – `18 VIIIA`), or period (`1` – `7`).
  - **Property Heatmaps**: color the periodic table by Category, Phase @ 273 K, Electronic Block (`s`, `p`, `d`, `f`), Atomic Radius [Å], 1st Ionisation Energy [eV], Electron Affinity [eV], or Relative Atomic Mass [Da].
  - **Property Trends Chart**: interactive SVG plot across atomic numbers $Z = 1\dots 118$.
  - **Sortable Data & YAML Explorer**: full table of all 118 elements with direct links to each element's `.yaml` file and Royal Society of Chemistry profile.
- **YAML Element Data (`elements/`)**:
  - One YAML file per element (`elements/H.yaml` through `elements/Og.yaml`) plus [`elements/categories.yaml`](elements/categories.yaml) for categories, phases, and group metadata.
- **Printable Typst Poster (`periodic-table.typ`)**:
  - Compile standalone or A4/A3 PDF and SVG posters using [Typst](https://typst.app/) and CeTZ.

## Building Locally

```bash
# 1. Extract/refresh YAML files from periodic-table.typ (if updated)
uv run --no-project python3 scripts/extract_elements.py

# 2. Compile printable PDF & SVG posters
typst compile periodic-table.typ periodic-table.pdf
typst compile --input paper=a4 periodic-table.typ periodic-table-a4.pdf
typst compile periodic-table.typ periodic-table.svg

# 3. Render Quarto website into _site/
quarto render
```
