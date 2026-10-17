#!/usr/bin/env python3
"""Compile printable Periodic Table PDFs (A0 to A5 + Auto) and SVGs in Light and Dark themes."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import pathlib
import subprocess


ROOT = pathlib.Path(__file__).resolve().parent.parent
TYP_FILE = ROOT / "periodic-table.typ"
DOWNLOADS_DIR = ROOT / "downloads"

PAPER_SIZES = ["a0", "a1", "a2", "a3", "a4", "a5"]
THEMES = ["light", "dark"]


def compile_target(cmd: list[str], out_path: pathlib.Path) -> str:
    subprocess.run(cmd, cwd=ROOT, check=True)
    return out_path.name


def main() -> None:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    tasks: list[tuple[list[str], pathlib.Path]] = []

    for theme in THEMES:
        # Paper sizes A0 through A5
        for paper in PAPER_SIZES:
            out_pdf = DOWNLOADS_DIR / f"periodic-table-{paper}-{theme}.pdf"
            cmd = [
                "typst",
                "compile",
                "--input",
                f"paper={paper}",
                "--input",
                f"theme={theme}",
                str(TYP_FILE),
                str(out_pdf),
            ]
            tasks.append((cmd, out_pdf))

        # Auto-sized PDF
        out_auto_pdf = DOWNLOADS_DIR / f"periodic-table-auto-{theme}.pdf"
        tasks.append(
            (
                [
                    "typst",
                    "compile",
                    "--input",
                    f"theme={theme}",
                    str(TYP_FILE),
                    str(out_auto_pdf),
                ],
                out_auto_pdf,
            )
        )

        # SVG vector
        out_svg = DOWNLOADS_DIR / f"periodic-table-{theme}.svg"
        tasks.append(
            (
                [
                    "typst",
                    "compile",
                    "--input",
                    f"theme={theme}",
                    str(TYP_FILE),
                    str(out_svg),
                ],
                out_svg,
            )
        )

    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(compile_target, cmd, out) for cmd, out in tasks]
        for fut in as_completed(futures):
            fut.result()

    print(f"Successfully compiled {len(tasks)} files in {DOWNLOADS_DIR}")


if __name__ == "__main__":
    main()

