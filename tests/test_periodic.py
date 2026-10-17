#!/usr/bin/env python3
"""Tests for periodic table YAML files and generated Quarto site."""

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

    def test_rendered_site(self) -> None:
        self.assertFalse((ROOT / "CNAME").exists(), "CNAME file should not be present")
        if SITE_DIR.is_dir():
            index_html = (SITE_DIR / "index.html").read_text(encoding="utf-8")
            self.assertIn("Periodic Table of Elements", index_html)
            self.assertIn("elem-H", index_html)
            self.assertIn("elem-Og", index_html)


if __name__ == "__main__":
    unittest.main()
