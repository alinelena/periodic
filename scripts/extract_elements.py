#!/usr/bin/env python3
"""Extract element and category data from periodic-table.typ into YAML files."""

from __future__ import annotations

import pathlib
import re
import yaml


ROOT = pathlib.Path(__file__).resolve().parent.parent
TYP_FILE = ROOT / "periodic-table.typ"
ELEMENTS_DIR = ROOT / "elements"

SUPERSCRIPTS = str.maketrans("0123456789+-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻")


def format_electron_conf(conf: str) -> str:
    """Convert Typst electron configuration like '[He] 2s^{1}' to '[He]2s¹'."""
    if not conf:
        return ""
    clean = conf.replace(" ", "")
    parts = clean.split("^")
    res = parts[0]
    for part in parts[1:]:
        if part.startswith("{"):
            idx = part.index("}")
            sup = part[1:idx].translate(SUPERSCRIPTS)
            rest = part[idx + 1 :]
            res += sup + rest
        else:
            sup = part[:1].translate(SUPERSCRIPTS)
            rest = part[1:]
            res += sup + rest
    return res


def format_electron_conf_html(conf: str) -> str:
    """Convert Typst electron configuration like '[He] 2s^{1}' to HTML '[He]2s<sup>1</sup>'."""
    if not conf:
        return ""
    clean = conf.replace(" ", "")
    parts = clean.split("^")
    res = parts[0]
    for part in parts[1:]:
        if part.startswith("{"):
            idx = part.index("}")
            sup = part[1:idx]
            rest = part[idx + 1 :]
            res += f"<sup>{sup}</sup>{rest}"
        else:
            sup = part[:1]
            rest = part[1:]
            res += f"<sup>{sup}</sup>{rest}"
    return res


def parse_oxidation_states(ox_raw: str) -> list[dict]:
    """Parse oxidation string like '6 *3* 2 0 -2' or '*4 2*' into structured list."""
    if not ox_raw or ox_raw == "U":
        return []
    # Fix spacing like '- 2' in Carbon ('4 3 2 1 0 -1 - 2 -3 *-4*')
    normalized = re.sub(r"-\s+(\d)", r"-\1", ox_raw.strip())
    result = []
    # Find spans inside *...* vs outside
    pos = 0
    for match in re.finditer(r"\*([^*]+)\*", normalized):
        before = normalized[pos : match.start()].strip()
        if before:
            for tok in before.split():
                result.append({"state": tok, "common": False})
        bold_part = match.group(1).strip()
        for tok in bold_part.split():
            result.append({"state": tok, "common": True})
        pos = match.end()
    after = normalized[pos:].strip()
    if after:
        for tok in after.split():
            result.append({"state": tok, "common": False})
    return result


def parse_float_or_none(val: str) -> float | None:
    if not val or val in ("U", "Ns"):
        return None
    cleaned = val.strip("[]")
    try:
        return float(cleaned)
    except ValueError:
        return None


def get_block(z: int) -> str:
    if z in (1, 2) or z in (3, 4, 11, 12, 19, 20, 37, 38, 55, 56, 87, 88):
        return "s"
    if 57 <= z <= 71 or 89 <= z <= 103:
        return "f"
    if (
        (21 <= z <= 30)
        or (39 <= z <= 48)
        or (72 <= z <= 80)
        or (104 <= z <= 112)
    ):
        return "d"
    return "p"


def main() -> None:
    ELEMENTS_DIR.mkdir(parents=True, exist_ok=True)
    text = TYP_FILE.read_text(encoding="utf-8")

    categories_meta = {
        "title": "Periodic Table of Elements",
        "links": {
            "rsc": "https://www.rsc.org/periodic-table",
            "source_gitlab": "https://gitlab.com/drFaustroll/periodic",
            "source_github": "https://github.com/alinelena/periodic",
        },
        "categories": {
            "AlkaliMetal": {
                "id": "AlkaliMetal",
                "label": "Alkali Metal",
                "color_name": "cb-burgundy",
                "stroke": "#98070c",
                "fill": "#faede6",
            },
            "AlkalineEarthMetal": {
                "id": "AlkalineEarthMetal",
                "label": "Alkaline Earth Metal",
                "color_name": "cb-brown",
                "stroke": "#9e5e06",
                "fill": "#faf3ea",
            },
            "TransMetal": {
                "id": "TransMetal",
                "label": "Transitional Metal",
                "color_name": "cb-salmon-pink",
                "stroke": "#fdbe81",
                "fill": "#fffbf7",
            },
            "Metal": {
                "id": "Metal",
                "label": "Post Trans Metal",
                "color_name": "cb-purple",
                "stroke": "#5f015d",
                "fill": "#f2ebf3",
            },
            "Metalloid": {
                "id": "Metalloid",
                "label": "Metalloid",
                "color_name": "cb-green-lime",
                "stroke": "#00ae61",
                "fill": "#f3f9f4",
            },
            "Nonmetal": {
                "id": "Nonmetal",
                "label": "Non metal",
                "color_name": "cb-green-sea",
                "stroke": "#00739e",
                "fill": "#eaf3f9",
            },
            "Halogen": {
                "id": "Halogen",
                "label": "Halogen",
                "color_name": "cb-blue-light",
                "stroke": "#b1c8e7",
                "fill": "#fafbfe",
            },
            "NobleGas": {
                "id": "NobleGas",
                "label": "Noble gas",
                "color_name": "cb-blue-sky",
                "stroke": "#6c9ed4",
                "fill": "#f5f7fd",
            },
            "Lanthanide": {
                "id": "Lanthanide",
                "label": "Lanthanide",
                "color_name": "cb-rose",
                "stroke": "#f58a91",
                "fill": "#fff8f7",
            },
            "Actinide": {
                "id": "Actinide",
                "label": "Actinide",
                "color_name": "cb-lilac",
                "stroke": "#b57fb8",
                "fill": "#f9f7fb",
            },
            "Unknown": {
                "id": "Unknown",
                "label": "Unknown properties",
                "color_name": "cb-clay",
                "stroke": "#e2ca00",
                "fill": "#fdfbf1",
            },
        },
        "phases": {
            "solid": {
                "id": "solid",
                "label": "solid@273K",
                "symbol": "⬛",
                "color": "#9e5e06",
            },
            "gas": {
                "id": "gas",
                "label": "gas@273K",
                "symbol": "⬤",
                "color": "#6c9ed4",
            },
            "liquid": {
                "id": "liquid",
                "label": "liquid@273K",
                "symbol": "▲",
                "color": "#00739e",
            },
            "unknown": {
                "id": "unknown",
                "label": "unknown",
                "symbol": "◆",
                "color": "#fdbe81",
            },
        },
        "markers": {
            "radioactive": {
                "id": "radioactive",
                "label": "radioactive",
                "symbol": "☢",
                "color": "#f58a91",
            },
            "lab": {
                "id": "lab",
                "label": "lab made",
                "symbol": "⚗",
                "color": "#00ae61",
            },
        },
        "groups": [
            {"number": 1, "label": "1 IA"},
            {"number": 2, "label": "2 IIA"},
            {"number": 3, "label": "3 IIIA"},
            {"number": 4, "label": "4 IVB"},
            {"number": 5, "label": "5 VB"},
            {"number": 6, "label": "6 VIB"},
            {"number": 7, "label": "7 VIIB"},
            {"number": 8, "label": "8 VIIIB"},
            {"number": 9, "label": "9 VIIIB"},
            {"number": 10, "label": "10 VIIIB"},
            {"number": 11, "label": "11 IB"},
            {"number": 12, "label": "12 IIB"},
            {"number": 13, "label": "13 IIIA"},
            {"number": 14, "label": "14 IVA"},
            {"number": 15, "label": "15 VA"},
            {"number": 16, "label": "16 VIA"},
            {"number": 17, "label": "17 VIIA"},
            {"number": 18, "label": "18 VIIIA"},
        ],
        "sample_element": {
            "atomic_number": 43,
            "phase": "solid",
            "lab_made": True,
            "radioactive": True,
            "atomic_mass": "[98]",
            "symbol": "Tc",
            "name": "Technetium",
            "category": "TransMetal",
            "oxidation_states": "*7*",
            "ionization_energy": "7.1194",
            "electron_configuration": "[Kr]4d^55s^2",
            "electron_configuration_formatted": "[Kr]4d⁵5s²",
            "atomic_radius": "2.16",
            "electron_affinity": "0.55",
        },
    }

    # Regex to match single-line elem(...) calls for the 118 elements
    elem_pattern = re.compile(
        r'^\s*elem\((.+?),\s*"([A-Za-z]+)",\s*"([A-Za-z]+)",\s*\[(.*?)\],\s*(\[\[.*?\]\]|\[.*?\]),\s*\[(.*?)\],\s*\[(.*?)\],\s*\[(.*?)\],\s*\[(.*?)\],\s*"(.*?)",\s*\[(.*?)\],\s*\[(.*?)\]\)',
        re.MULTILINE,
    )

    group_labels = {g["number"]: g["label"] for g in categories_meta["groups"]}

    elements = []
    for match in elem_pattern.finditer(text):
        pos_expr, elem_id, category, n_sym, mass_raw, sym, name, ox, ion, conf, rad, aff = (
            match.groups()
        )
        if elem_id in ("LaLu", "AcLr"):
            continue

        # Parse n_sym like "1 #gas" or "104 #unk#lab" or "118 #unk#radio"
        z_match = re.match(r"^(\d+)", n_sym.strip())
        if not z_match:
            continue
        z = int(z_match.group(1))

        if "#solid" in n_sym:
            phase = "solid"
        elif "#liquid" in n_sym:
            phase = "liquid"
        elif "#gas" in n_sym:
            phase = "gas"
        else:
            phase = "unknown"

        lab_made = "#lab" in n_sym
        radio_marker = "#radio" in n_sym
        # Elements with no stable isotopes (Tc=43, Pm=61, Z>=84)
        is_radioactive = radio_marker or (z in (43, 61) or z >= 84)

        # Clean mass_raw: e.g. "[1.008]" -> "1.008", "[[223]]" -> "[223]"
        mass_str = mass_raw[1:-1]
        mass_unstable = mass_str.startswith("[") and mass_str.endswith("]")

        # Determine period, group, and grid coordinates
        if z == 1:
            period, group, grid_row, grid_col = 1, 1, 1, 1
        elif z == 2:
            period, group, grid_row, grid_col = 1, 18, 1, 18
        elif 3 <= z <= 4:
            period, group, grid_row, grid_col = 2, z - 2, 2, z - 2
        elif 5 <= z <= 10:
            period, group, grid_row, grid_col = 2, z + 8, 2, z + 8
        elif 11 <= z <= 12:
            period, group, grid_row, grid_col = 3, z - 10, 3, z - 10
        elif 13 <= z <= 18:
            period, group, grid_row, grid_col = 3, z, 3, z
        elif 19 <= z <= 36:
            period, group, grid_row, grid_col = 4, z - 18, 4, z - 18
        elif 37 <= z <= 54:
            period, group, grid_row, grid_col = 5, z - 36, 5, z - 36
        elif 55 <= z <= 56:
            period, group, grid_row, grid_col = 6, z - 54, 6, z - 54
        elif 57 <= z <= 71:
            period = 6
            group = 3 if z == 57 else None
            grid_row = 9
            grid_col = 4 + (z - 57)
        elif 72 <= z <= 86:
            period, group, grid_row, grid_col = 6, z - 68, 6, z - 68
        elif 87 <= z <= 88:
            period, group, grid_row, grid_col = 7, z - 86, 7, z - 86
        elif 89 <= z <= 103:
            period = 7
            group = 3 if z == 89 else None
            grid_row = 10
            grid_col = 4 + (z - 89)
        elif 104 <= z <= 118:
            period, group, grid_row, grid_col = 7, z - 100, 7, z - 100
        else:
            raise ValueError(f"Unexpected atomic number {z}")

        ox_normalized = re.sub(r"-\s+(\d)", r"-\1", ox.strip())
        ox_list = parse_oxidation_states(ox)

        elem_data = {
            "atomic_number": z,
            "symbol": sym.strip(),
            "name": name.strip(),
            "category": category,
            "category_label": categories_meta["categories"][category]["label"],
            "period": period,
            "group": group,
            "group_label": group_labels.get(group, category),
            "block": get_block(z),
            "grid_row": grid_row,
            "grid_col": grid_col,
            "phase": phase,
            "lab_made": lab_made,
            "radioactive_marker": radio_marker,
            "is_radioactive": is_radioactive,
            "atomic_mass": mass_str,
            "atomic_mass_value": parse_float_or_none(mass_str),
            "atomic_mass_most_stable_isotope": mass_unstable,
            "oxidation_states": ox_normalized,
            "oxidation_states_parsed": ox_list,
            "ionization_energy": ion.strip(),
            "ionization_energy_ev": parse_float_or_none(ion.strip()),
            "electron_configuration": conf.strip(),
            "electron_configuration_formatted": format_electron_conf(conf.strip()),
            "electron_configuration_html": format_electron_conf_html(conf.strip()),
            "atomic_radius": rad.strip(),
            "atomic_radius_angstrom": parse_float_or_none(rad.strip()),
            "electron_affinity": aff.strip(),
            "electron_affinity_ev": parse_float_or_none(aff.strip()),
            "rsc_url": f"https://www.rsc.org/periodic-table/element/{z}/{name.strip().lower()}",
        }
        elements.append(elem_data)

    elements.sort(key=lambda e: e["atomic_number"])
    assert len(elements) == 118, f"Expected 118 elements, got {len(elements)}"

    # Write categories.yaml
    with open(ELEMENTS_DIR / "categories.yaml", "w", encoding="utf-8") as f:
        yaml.safe_dump(categories_meta, f, sort_keys=False, allow_unicode=True)

    # Write one YAML file per element: elements/<Symbol>.yaml
    for elem in elements:
        sym = elem["symbol"]
        with open(ELEMENTS_DIR / f"{sym}.yaml", "w", encoding="utf-8") as f:
            yaml.safe_dump(elem, f, sort_keys=False, allow_unicode=True)

    print(f"Successfully wrote categories.yaml and {len(elements)} element YAML files to {ELEMENTS_DIR}")


if __name__ == "__main__":
    main()
