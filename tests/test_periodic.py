#!/usr/bin/env python3
"""Tests for periodic table YAML files, A0-A5 light/dark downloads, and generated Quarto site."""

from __future__ import annotations

import pathlib
import unittest
import yaml


ROOT = pathlib.Path(__file__).resolve().parent.parent
ELEMENTS_DIR = ROOT / "elements"
SITE_DIR = ROOT / "_site"


class TestPeriodicTableSite(unittest.TestCase):
    def test_categories_yaml_exists_and_valid(self) -> None:
        cat_file = ELEMENTS_DIR / "categories.yaml"
        self.assertTrue(cat_file.is_file(), "elements/categories.yaml must exist")
        data = yaml.safe_load(cat_file.read_text(encoding="utf-8"))
        self.assertEqual(len(data["categories"]), 11)
        for cat in data["categories"].values():
            self.assertIn("stroke", cat)
            self.assertIn("fill", cat)
            self.assertIn("stroke_dark", cat)
            self.assertIn("fill_dark", cat)
        self.assertEqual(len(data["phases"]), 4)
        self.assertEqual(len(data["groups"]), 18)

    def test_all_118_element_yaml_files(self) -> None:
        elem_files = [p for p in ELEMENTS_DIR.glob("*.yaml") if p.name != "categories.yaml"]
        self.assertEqual(len(elem_files), 118, "Must have exactly 118 element YAML files")

        seen_z = set()
        seen_coords = set()
        for p in elem_files:
            el = yaml.safe_load(p.read_text(encoding="utf-8"))
            self.assertEqual(p.stem, el["symbol"])
            z = el["atomic_number"]
            self.assertGreaterEqual(z, 1)
            self.assertLessEqual(z, 118)
            self.assertNotIn(z, seen_z, f"Duplicate atomic number {z}")
            seen_z.add(z)

            coord = (el["grid_row"], el["grid_col"])
            self.assertNotIn(coord, seen_coords, f"Duplicate grid position {coord} for {el['symbol']}")
            seen_coords.add(coord)

        self.assertEqual(seen_z, set(range(1, 119)))

    def test_rendered_site_and_downloads(self) -> None:
        self.assertFalse((ROOT / "CNAME").exists(), "CNAME file should not be present")
        if SITE_DIR.is_dir():
            index_html = (SITE_DIR / "index.html").read_text(encoding="utf-8")
            self.assertIn("Periodic Table of Elements", index_html)
            self.assertIn("elem-H", index_html)
            self.assertIn("elem-Og", index_html)

            for theme in ("light", "dark"):
                for paper in ("a0", "a1", "a2", "a3", "a4", "a5", "auto"):
                    fname = f"downloads/periodic-table-{paper}-{theme}.pdf"
                    self.assertIn(fname, index_html)
                    self.assertTrue((SITE_DIR / fname).is_file(), f"Missing {fname} in _site")
                svg_name = f"downloads/periodic-table-{theme}.svg"
                self.assertIn(svg_name, index_html)
                self.assertTrue((SITE_DIR / svg_name).is_file(), f"Missing {svg_name} in _site")

    def test_fit_screen_and_theme_styling(self) -> None:
        css = (ROOT / "styles.css").read_text(encoding="utf-8")
        js = (ROOT / "assets" / "periodic.js").read_text(encoding="utf-8")
        app_html = (ROOT / "_includes" / "periodic-app.html").read_text(encoding="utf-8")

        # CSS assertions for Fit Screen and Scroll modes
        self.assertIn(".pt-grid:not(.pt-scroll-mode)", css)
        self.assertIn(".pt-grid.pt-scroll-mode", css)
        self.assertIn("min-width: 0 !important", css)
        self.assertIn("min-width: 1540px !important", css)

        # CSS assertions for Light / Dark themes
        self.assertIn('[data-bs-theme="dark"]', css)
        self.assertIn("body.pt-dark-theme", css)
        self.assertIn("--pt-page-bg", css)

        # JS assertions for theme & width management
        self.assertIn("function setBgTheme", js)
        self.assertIn("function setWidthMode", js)
        self.assertIn("function setDensity", js)
        self.assertIn("localStorage.getItem", js)

        # CSS assertions for mobile sample element and legend
        self.assertIn(".pt-sample-elem", css)
        self.assertIn("min-width: 180px !important", css)
        self.assertIn("@media (max-width: 575.98px)", css)
        self.assertIn("grid-template-areas", css)

        # HTML assertions for mode control radio inputs
        self.assertIn('id="pt-width-fit"', app_html)
        self.assertIn('id="pt-width-scroll"', app_html)
        self.assertIn('id="pt-bg-light"', app_html)
        self.assertIn('id="pt-bg-dark"', app_html)
        self.assertIn('autocomplete="off"', app_html)

        # eu-github color theme selector assertions
        self.assertIn('id="corner-theme-panel"', app_html)
        self.assertIn('data-theme-id="nord"', app_html)
        self.assertIn('data-theme-id="dracula"', app_html)
        self.assertIn('data-theme-id="monokai"', app_html)
        self.assertIn('data-theme-id="gruvbox"', app_html)
        self.assertIn('data-theme-id="catppuccin"', app_html)
        self.assertIn('data-theme-id="solarized"', app_html)

        self.assertIn('[data-theme="nord"]', css)
        self.assertIn('[data-theme="dracula"]', css)
        self.assertIn('.corner-theme-btn', css)
        self.assertIn('.corner-theme-panel', css)

        self.assertIn("function applyTheme", js)
        self.assertIn("function initThemeSelector", js)

        # Ensure YAML Schema is removed from top menu navbar in _quarto.yml
        quarto_yml = (ROOT / "_quarto.yml").read_text(encoding="utf-8")
        y_data = yaml.safe_load(quarto_yml)
        nav_left_texts = [item.get("text") for item in y_data["website"]["navbar"]["left"]]
        self.assertNotIn("YAML Schema", nav_left_texts, "YAML Schema must not be in top menu navbar")


if __name__ == "__main__":
    unittest.main()

