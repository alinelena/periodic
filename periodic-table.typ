// Adapted from periodic-table.tex
// Converted to Typst using CeTZ (https://typst.app/universe/package/cetz)
#import "@preview/cetz:0.4.2"

#let paper-size = sys.inputs.at("paper", default: none)
#let theme-mode = lower(sys.inputs.at("theme", default: "light"))
#let is-dark = theme-mode == "dark"

// Color definitions (CMYK)
#let cb-black       = cmyk(0.0%, 0.0%, 0.0%, 100.0%)
#let cb-blue-green  = cmyk(100.0%, 0.0%, 0.0%, 71.4%)
#let cb-green-sea   = cmyk(100.0%, 0.0%, 0.0%, 42.7%)
#let cb-rose        = cmyk(0.0%, 57.3%, 28.6%, 0.0%)
#let cb-salmon-pink = cmyk(0.0%, 28.6%, 53.3%, 0.0%)
#let cb-purple      = cmyk(50.0%, 100.0%, 0.0%, 42.7%)
#let cb-blue        = cmyk(100.0%, 50.2%, 0.0%, 14.1%)
#let cb-lilac       = cmyk(28.6%, 57.3%, 0.0%, 0.0%)
#let cb-blue-sky    = cmyk(57.3%, 28.6%, 0.0%, 0.0%)
#let cb-blue-light  = cmyk(28.6%, 14.1%, 0.0%, 0.0%)
#let cb-burgundy    = cmyk(0.0%, 100.0%, 100.0%, 42.7%)
#let cb-brown       = cmyk(0.0%, 50.0%, 100.0%, 42.7%)
#let cb-clay        = cmyk(0.0%, 4.57%, 100.0%, 14.1%)
#let cb-green-lime  = cmyk(85.9%, 0.0%, 85.9%, 0.0%)
#let cb-yellow      = cmyk(0.0%, 0.0%, 57.3%, 0.0%)

#let page-fill = if is-dark { rgb("#14161a") } else { white }
#let text-fill = if is-dark { rgb("#f1f3f5") } else { cb-black }

#set page(
  fill: page-fill,
  ..(if paper-size != none and paper-size != "auto" {
    (paper: lower(paper-size), flipped: true, margin: 5mm, numbering: none)
  } else {
    (:)
  }),
)
#set text(font: "Noto Sans", size: 10pt, fill: text-fill)

// Phase and property symbols
#let solid  = text(font: "Noto Sans Symbols 2", fill: if is-dark { cb-brown.lighten(30%) } else { cb-brown })[⬛]
#let liquid = text(font: "Noto Sans Symbols 2", fill: if is-dark { cb-green-sea.lighten(30%) } else { cb-green-sea })[▲]
#let gas    = text(font: "Noto Sans Symbols 2", fill: cb-blue-sky)[⬤]
#let unk    = text(font: "Noto Sans Symbols 2", fill: cb-salmon-pink)[◆]
#let radio  = text(font: "Noto Sans Symbols 2", fill: cb-rose)[☢]
#let lab    = text(font: "Noto Color Emoji", fill: cb-green-lime)[⚗]

// Fill & Stroke Styles
#let make-fill(col) = if is-dark {
  (
    stroke: 1.6pt + col.lighten(25%),
    fill: color.mix((col, 24%), (rgb("#1c2026"), 76%)),
  )
} else {
  (
    stroke: 1.6pt + col,
    fill: col.lighten(95%),
  )
}

#let styles = (
  AlkaliMetal:        make-fill(cb-burgundy),
  AlkalineEarthMetal: make-fill(cb-brown),
  Metal:              make-fill(cb-purple),
  TransMetal:         make-fill(cb-salmon-pink),
  Metalloid:          make-fill(cb-green-lime),
  Nonmetal:           make-fill(cb-green-sea),
  Halogen:            make-fill(cb-blue-light),
  NobleGas:           make-fill(cb-blue-sky),
  Lanthanide:         make-fill(cb-rose),
  Actinide:           make-fill(cb-lilac),
  Unknown:            make-fill(cb-clay),
)

// Helper for ground-state electron configuration (e.g. "[He] 2s^1" -> "[He]2s¹")
#let fmt-conf(s) = {
  if s == "" { return [] }
  let clean = s.replace(" ", "")
  let parts = clean.split("^")
  let res = [#parts.at(0)]
  for p in parts.slice(1) {
    if p.starts-with("{") {
      let idx = p.position("}")
      let sup = p.slice(1, idx)
      let rest = p.slice(idx + 1)
      res = res + super(sup) + [#rest]
    } else {
      let sup = p.slice(0, 1)
      let rest = p.slice(1)
      res = res + super(sup) + [#rest]
    }
  }
  res
}

// Element label layout matching \ElemLabel and \Elem
#let elem-content(n-sym, mass, sym, name, ox, ion, conf, rad, aff, scale-factor: 1.0) = {
  set text(size: 10pt * scale-factor)
  block(width: 3.1cm * scale-factor, inset: 0pt, {
    set align(center)
    set par(leading: 0.42em, spacing: 0.42em)
    [*#n-sym* #h(1fr) #text(tracking: -0.15pt)[#ox] \ ]
    [*#mass* #h(1fr) *#ion* \ ]
    [*#rad* #h(1fr) *#aff* \ ]
    [#text(size: 20.74pt * scale-factor, weight: "bold")[#sym] \ ]
    [*#name* \ ]
    [#fmt-conf(conf)]
  })
}

// Legend box label layout matching \LegendLabel
#let legend-content(lbl) = {
  block(width: 2.3cm, inset: 0pt, {
    set align(center + horizon)
    set par(leading: 0.4em)
    text(size: 12pt, weight: "bold")[#lbl]
  })
}

#let periodic-canvas = cetz.canvas(length: 1cm, {
  import cetz.draw: *

  let elem-step = 3.5
  let elem-size = 3.25
  let elem-rad  = 0.5

  let leg-step  = 2.65
  let leg-size  = 2.5
  let leg-rad   = 0.5

  // Helper to place an Element node at pos
  let elem(pos, id, category, n-sym, mass, sym, name, ox, ion, conf, rad, aff, scale-factor: 1.0) = {
    let st = styles.at(category)
    let w = elem-size * scale-factor
    let h = elem-size * scale-factor
    let r = elem-rad * scale-factor
    rect(
      (rel: (-w / 2, -h / 2), to: pos),
      (rel: (w / 2, h / 2), to: pos),
      name: id,
      radius: r,
      stroke: (paint: st.stroke.paint, thickness: st.stroke.thickness * scale-factor),
      fill: st.fill,
    )
    content(
      id,
      elem-content(n-sym, mass, sym, name, ox, ion, conf, rad, aff, scale-factor: scale-factor),
    )
  }

  let below-of(target, dist: elem-step, xshift: 0, yshift: 0) = (
    rel: (xshift, -dist + yshift),
    to: target,
  )
  let above-of(target, dist: elem-step, xshift: 0, yshift: 0) = (
    rel: (xshift, dist + yshift),
    to: target,
  )
  let right-of(target, dist: elem-step, xshift: 0, yshift: 0) = (
    rel: (dist + xshift, yshift),
    to: target,
  )
  let left-of(target, dist: elem-step, xshift: 0, yshift: 0) = (
    rel: (-dist + xshift, yshift),
    to: target,
  )

  // Group 1 - IA
  elem((0, 0),          "H",  "Nonmetal",    [1 #gas],    [1.008],   [H],  [Hydrogen],  [*1* -1], [13.6],  "1s^{1}",     [1.1],  [0.7542])
  elem(below-of("H"),   "Li", "AlkaliMetal", [3 #solid],  [6.94],    [Li], [Lithium],   [*1*],    [5.392], "[He] 2s^{1}", [1.82], [0.618])
  elem(below-of("Li"),  "Na", "AlkaliMetal", [11 #solid], [22.990],  [Na], [Sodium],    [*1*],    [5.139], "[Ne] 3s^{1}", [2.27], [0.5479])
  elem(below-of("Na"),  "K",  "AlkaliMetal", [19 #solid], [39.098],  [K],  [Potassium], [*1*],    [4.341], "[Ar] 4s^{1}", [2.75], [0.5015])
  elem(below-of("K"),   "Rb", "AlkaliMetal", [37 #solid], [85.468],  [Rb], [Rubidium],  [*1*],    [4.177], "[Kr] 5s^{1}", [3.03], [0.4859])
  elem(below-of("Rb"),  "Cs", "AlkaliMetal", [55 #solid], [132.905], [Cs], [Caesium],   [*1*],    [3.894], "[Xe] 6s^{1}", [3.43], [0.4716])
  elem(below-of("Cs"),  "Fr", "AlkaliMetal", [87 #solid], [[223]],   [Fr], [Francium],  [*1*],    [4.073], "[Rn] 7s^{1}", [3.48], [0.46])

  // Group 2 - IIA
  elem(right-of("Li"),  "Be", "AlkalineEarthMetal", [4 #solid],  [9.012],   [Be], [Beryllium], [*2*], [9.323], "[He] 2s^{2}", [1.53], [Ns])
  elem(below-of("Be"),  "Mg", "AlkalineEarthMetal", [12 #solid], [24.305],  [Mg], [Magnesium], [*2*], [7.646], "[Ne] 3s^{2}", [1.73], [Ns])
  elem(below-of("Mg"),  "Ca", "AlkalineEarthMetal", [20 #solid], [40.078],  [Ca], [Calcium],   [*2*], [6.113], "[Ar] 4s^{2}", [2.31], [0.02455])
  elem(below-of("Ca"),  "Sr", "AlkalineEarthMetal", [38 #solid], [87.62],   [Sr], [Strontium], [*2*], [5.695], "[Kr] 5s^{2}", [2.49], [0.048])
  elem(below-of("Sr"),  "Ba", "AlkalineEarthMetal", [56 #solid], [137.327], [Ba], [Barium],    [*2*], [5.212], "[Xe] 6s^{2}", [2.68], [0.1446])
  elem(below-of("Ba"),  "Ra", "AlkalineEarthMetal", [88 #solid], [[226]],   [Ra], [Radium],    [*2*], [5.278], "[Rn] 7s^{2}", [2.83], [0.1])

  // Group 3 - IIIB
  elem(right-of("Ca"),   "Sc",   "TransMetal", [21 #solid], [44.956], [Sc],    [Scandium],   [*3*], [6.561], "[Ar] 3d^{1}4s^{2}", [2.15], [0.188])
  elem(below-of("Sc"),   "Y",    "TransMetal", [39 #solid], [88.906], [Y],     [Yttrium],    [*3*], [6.217], "[Kr] 4d^{1}5s^{2}", [2.32], [0.307])
  elem(below-of("Y"),    "LaLu", "Lanthanide", [57-71],     [],       [La-Lu], [Lanthanide], [],    [],      "",                  [],     [])
  elem(below-of("LaLu"), "AcLr", "Actinide",   [89-103],    [],       [Ac-Lr], [Actinide],   [],    [],      "",                  [],     [])

  // Group 4 - IVB
  elem(right-of("Sc"), "Ti", "TransMetal", [22 #solid],     [47.867],  [Ti], [Titanium],      [*4* 3], [6.828], "[Ar] 3d^{2}4s^{2}",       [2.11], [0.079])
  elem(below-of("Ti"), "Zr", "TransMetal", [40 #solid],     [91.224],  [Zr], [Zirconium],     [*4*],   [6.634], "[Kr] 4d^{2}5s^{2}",       [2.23], [0.426])
  elem(below-of("Zr"), "Hf", "TransMetal", [72 #solid],     [178.486], [Hf], [Hafnium],       [*4*],   [6.825], "[Xe] 4f^{14}5d^{2}6s^{2}", [2.23], [0.014])
  elem(below-of("Hf"), "Rf", "TransMetal", [104 #unk#lab],  [[267]],   [Rf], [Rutherfordium], [U],     [6.001], "[Rn] 5f^{14}6d^{2}7s^{2}", [U],    [U])

  // Group 5 - VB
  elem(right-of("Ti"), "V",  "TransMetal", [23 #solid],    [50.942],  [V],  [Vanadium], [*5* 4 3 2 0], [6.746], "[Ar] 3d^{3}4s^{2}",       [2.07], [0.525])
  elem(below-of("V"),  "Nb", "TransMetal", [41 #solid],    [92.906],  [Nb], [Niobium],  [*5* 3],       [6.759], "[Kr] 4d^{4}5s^{1}",       [2.18], [0.916])
  elem(below-of("Nb"), "Ta", "TransMetal", [73 #solid],    [180.948], [Ta], [Tantalum], [*5*],         [7.549], "[Xe] 4f^{14}5d^{3}6s^{2}", [2.22], [0.322])
  elem(below-of("Ta"), "Db", "TransMetal", [105 #unk#lab], [[268]],   [Db], [Dubnium],  [U],           [U],     "[Rn] 5f^{14}6d^{3}7s^{2}", [U],    [U])

  // Group 6 - VIB
  elem(right-of("V"),  "Cr", "TransMetal", [24 #solid],    [51.996], [Cr], [Chromium],   [6 *3* 2 0],   [6.766], "[Ar] 3d^{5}4s^{1}",       [2.06], [0.666])
  elem(below-of("Cr"), "Mo", "TransMetal", [42 #solid],    [95.95],  [Mo], [Molybdenum], [*6* 5 4 3 2 0], [7.092], "[Kr] 4d^{5}5s^{1}",     [2.17], [0.748])
  elem(below-of("Mo"), "W",  "TransMetal", [74 #solid],    [183.84], [W],  [Tungsten],   [*6* 5 4 3 2 0], [7.864], "[Xe] 4f^{14}5d^{4}6s^{2}", [2.18], [0.8162])
  elem(below-of("W"),  "Sg", "TransMetal", [106 #unk#lab], [[269]],  [Sg], [Seaborgium], [U],           [U],     "[Rn] 5f^{14}6d^{4}7s^{2}", [U],    [U])

  // Group 7 - VIIB
  elem(right-of("Cr"), "Mn", "TransMetal", [25 #solid],     [54.938],  [Mn], [Manganese],  [7 6 4 3 *2* 0 -1], [7.434], "[Ar] 3d^{5}4s^{2}",       [2.05], [Ns])
  elem(below-of("Mn"), "Tc", "TransMetal", [43 #solid#lab], [[98]],    [Tc], [Technetium], [*7*],              [7.28],  "[Kr] 4d^{5}5s^{2}",       [2.16], [0.55])
  elem(below-of("Tc"), "Re", "TransMetal", [75 #solid],     [186.207], [Re], [Rhenium],    [*7* 6 4 2 -1],     [7.833], "[Xe] 4f^{14}5d^{5}6s^{2}", [2.16], [0.15])
  elem(below-of("Re"), "Bh", "TransMetal", [107 #unk#lab],  [[270]],   [Bh], [Bohrium],    [U],                [U],     "[Rn] 5f^{14}6d^{5}7s^{2}", [U],    [U])

  // Group 8 - VIIIB
  elem(right-of("Mn"), "Fe", "TransMetal", [26 #solid],    [55.845], [Fe], [Iron],      [6 *3* 2 0 -2],     [7.902], "[Ar] 3d^{6}4s^{2}",       [2.04], [0.151])
  elem(below-of("Fe"), "Ru", "TransMetal", [44 #solid],    [101.07], [Ru], [Ruthenium], [8 6 *4* 3 2 0 -2], [7.36],  "[Kr] 4d^{7}5s^{1}",       [2.13], [1.05])
  elem(below-of("Ru"), "Os", "TransMetal", [76 #solid],    [190.23], [Os], [Osmium],    [8 6 *4* 3 2 0 -2], [8.438], "[Xe] 4f^{14}5d^{6}6s^{2}", [2.16], [1.1])
  elem(below-of("Os"), "Hs", "TransMetal", [108 #unk#lab], [[269]],  [Hs], [Hassium],   [U],                [U],     "[Rn] 5f^{14}6d^{6}7s^{2}", [U],    [U])

  // Group 9 - VIIIB
  elem(right-of("Fe"), "Co", "TransMetal", [27 #solid],    [58.933],  [Co], [Cobalt],     [3 *2* 0 -1],       [7.881], "[Ar] 3d^{7}4s^{2}",       [2.0],  [0.662])
  elem(below-of("Co"), "Rh", "TransMetal", [45 #solid],    [102.906], [Rh], [Rhodium],    [5 4 *3* 2 1 0],    [7.459], "[Kr] 4d^{8}5s^{1}",       [2.1],  [1.137])
  elem(below-of("Rh"), "Ir", "TransMetal", [77 #solid],    [192.217], [Ir], [Iridium],    [6 *4* 3 2 *1* 0 -1], [8.967], "[Xe] 4f^{14}5d^{7}6s^{2}", [2.13], [1.564])
  elem(below-of("Ir"), "Mt", "Unknown",    [109 #unk#lab], [[278]],   [Mt], [Meitnerium], [U],                [U],     "[Rn] 5f^{14}6d^{7}7s^{2}", [U],    [U])

  // Group 10 - VIIIB
  elem(right-of("Co"), "Ni", "TransMetal", [28 #solid],    [58.693],  [Ni], [Nickel],       [3 *2* 0], [7.64],  "[Ar] 3d^{8}4s^{2}",       [1.97], [1.156])
  elem(below-of("Ni"), "Pd", "TransMetal", [46 #solid],    [106.42],  [Pd], [Palladium],    [4 *2* 0], [8.337], "[Kr] 4d^{10}",            [2.1],  [0.562])
  elem(below-of("Pd"), "Pt", "TransMetal", [78 #solid],    [195.084], [Pt], [Platinum],     [*4 2*],   [8.959], "[Xe] 4f^{14}5d^{9}6s^{1}", [2.13], [2.128])
  elem(below-of("Pt"), "Ds", "Unknown",    [110 #unk#lab], [[281]],   [Ds], [Darmstadtium], [U],       [U],     "[Rn] 5f^{14}6d^{9}7s^{1}", [U],    [U])

  // Group 11 - IB
  elem(right-of("Ni"), "Cu", "TransMetal", [29 #solid],    [63.546],  [Cu], [Copper],      [*2* 1],          [7.726], "[Ar] 3d^{10}4s^{1}",       [1.96], [1.235])
  elem(below-of("Cu"), "Ag", "TransMetal", [47 #solid],    [107.868], [Ag], [Silver],      [2 *1*],          [7.576], "[Kr] 4d^{10}5s^{1}",       [2.11], [1.302])
  elem(below-of("Ag"), "Au", "TransMetal", [79 #solid],    [196.967], [Au], [Gold],        [5 4 *3* 2 1 -1], [9.225], "[Xe] 4f^{14}5d^{10}6s^{1}", [2.14], [2.309])
  elem(below-of("Au"), "Rg", "Unknown",    [111 #unk#lab], [[280]],   [Rg], [Roentgenium], [U],              [U],     "[Rn] 5f^{14}6d^{10}7s^{1}", [U],    [U])

  // Group 12 - IIB
  elem(right-of("Cu"), "Zn", "TransMetal", [30 #solid],    [65.38],   [Zn], [Zinc],        [*2*],   [9.394], "[Ar] 3d^{10}4s^{2}",       [2.01], [Ns])
  elem(below-of("Zn"), "Cd", "TransMetal", [48 #solid],    [112.414], [Cd], [Cadmium],     [*2*],   [8.994], "[Kr] 4d^{10}5s^{2}",       [2.18], [Ns])
  elem(below-of("Cd"), "Hg", "TransMetal", [80 #liquid],   [200.592], [Hg], [Mercury],     [*2* 1], [10.44], "[Xe] 4f^{14}5d^{10}6s^{2}", [2.23], [Ns])
  elem(below-of("Hg"), "Cn", "Unknown",    [112 #unk#lab], [[285]],   [Cn], [Copernicium], [U],     [U],     "[Rn] 5f^{14}6d^{10}7s^{2}", [U],    [U])

  // Group 13 - IIIA
  elem(right-of("Zn"), "Ga", "Metal",     [31 #solid],    [69.723],  [Ga], [Gallium],   [*3*],   [5.999], "[Ar] 3d^{10}4s^{2}4p^{1}",       [1.87], [0.43])
  elem(above-of("Ga"), "Al", "Metal",     [13 #solid],    [26.982],  [Al], [Aluminium], [*3*],   [5.986], "[Ne] 3s^{2}3p^{1}",              [1.84], [0.4328])
  elem(above-of("Al"), "B",  "Metalloid", [5 #solid],     [10.81],   [B],  [Boron],     [*3*],   [8.298], "[He] 2s^{2}2p^{1}",              [1.92], [0.2797])
  elem(below-of("Ga"), "In", "Metal",     [49 #solid],    [114.818], [In], [Indium],    [*3*],   [5.786], "[Kr] 4d^{10}5s^{2}5p^{1}",       [1.93], [0.2995])
  elem(below-of("In"), "Tl", "Metal",     [81 #solid],    [204.38],  [Tl], [Thallium],  [3 *1*], [6.108], "[Xe] 4f^{14}5d^{10}6s^{2}6p^{1}", [1.96], [0.377])
  elem(below-of("Tl"), "Nh", "Unknown",   [113 #unk#lab], [[286]],   [Nh], [Nihonium],  [U],     [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{1}", [U],    [U])

  // Group 14 - IVA
  elem(right-of("B"),  "C",  "Nonmetal",  [6 #solid],     [12.011],  [C],  [Carbon],    [4 3 2 1 0 -1 - 2 -3 *-4*], [11.26], "[He] 2s^{2}2p^{2}",              [1.7],  [1.262])
  elem(below-of("C"),  "Si", "Metalloid", [14 #solid],    [28.085],  [Si], [Silicon],   [*4* -4],                   [8.152], "[Ne] 3s^{2}3p^{2}",              [2.1],  [1.389])
  elem(below-of("Si"), "Ge", "Metalloid", [32 #solid],    [72.630],  [Ge], [Germanium], [*4*],                      [7.899], "[Ar] 3d^{10}4s^{2}4p^{2}",       [2.11], [1.233])
  elem(below-of("Ge"), "Sn", "Metal",     [50 #solid],    [118.710], [Sn], [Tin],       [*4 2*],                    [7.344], "[Kr] 4d^{10}5s^{2}5p^{2}",       [2.17], [1.112])
  elem(below-of("Sn"), "Pb", "Metal",     [82 #solid],    [207.2],   [Pb], [Lead],      [4 *2*],                    [7.417], "[Xe] 4f^{14}5d^{10}6s^{2}6p^{2}", [2.02], [0.364])
  elem(below-of("Pb"), "Fl", "Unknown",   [114 #unk#lab], [[289]],   [Fl], [Flerovium], [U],                        [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{2}", [U],    [U])

  // Group 15 - VA
  elem(right-of("C"),  "N",  "Nonmetal",  [7 #gas],       [14.007],  [N],  [Nitrogen],   [5 4 3 2 *-3*], [14.53], "[He] 2s^{2}2p^{3}",              [1.55], [Ns])
  elem(below-of("N"),  "P",  "Nonmetal",  [15 #solid],    [30.974],  [P],  [Phosphorus], [*5* 3 -3],     [10.49], "[Ne] 3s^{2}3p^{3}",              [1.8],  [0.7466])
  elem(below-of("P"),  "As", "Metalloid", [33 #solid],    [74.922],  [As], [Arsenic],    [5 *3* -3],     [9.788], "[Ar] 3d^{10}4s^{2}4p^{3}",       [1.85], [0.804])
  elem(below-of("As"), "Sb", "Metalloid", [51 #solid],    [121.760], [Sb], [Antimony],   [5 *3* -3],     [8.608], "[Kr] 4d^{10}5s^{2}5p^{3}",       [2.06], [1.046])
  elem(below-of("Sb"), "Bi", "Metal",     [83 #solid],    [208.980], [Bi], [Bismuth],    [5 *3*],        [7.285], "[Xe] 4f^{14}5d^{10}6s^{2}6p^{3}", [2.07], [0.9423])
  elem(below-of("Bi"), "Mc", "Unknown",   [115 #unk#lab], [[289]],   [Mc], [Moscovium],  [U],            [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{3}", [U],    [U])

  // Group 16 - VIA
  elem(right-of("N"),  "O",  "Nonmetal",  [8 #gas],       [15.999], [O],  [Oxygen],      [-1 *-2*],   [13.62], "[He] 2s^{2}2p^{4}",              [1.52], [1.461])
  elem(below-of("O"),  "S",  "Nonmetal",  [16 #solid],    [32.06],  [S],  [Sulfur],      [*6* 4 2 -2], [10.36], "[Ne] 3s^{2}3p^{4}",             [1.8],  [2.077])
  elem(below-of("S"),  "Se", "Nonmetal",  [34 #solid],    [78.971], [Se], [Selenium],    [6 *4* -2],  [9.752], "[Ar] 3d^{10}4s^{2}4p^{4}",       [1.9],  [2.021])
  elem(below-of("Se"), "Te", "Metalloid", [52 #solid],    [127.60], [Te], [Tellurium],   [6 *4* -2],  [9.009], "[Kr] 4d^{10}5s^{2}5p^{4}",       [2.06], [1.971])
  elem(below-of("Te"), "Po", "Metalloid", [84 #solid],    [[209]],  [Po], [Polonium],    [6 *4* 2],   [8.414], "[Xe] 4f^{14}5d^{10}6s^{2}6p^{4}", [1.97], [1.9])
  elem(below-of("Po"), "Lv", "Unknown",   [116 #unk#lab], [[293]],  [Lv], [Livermorium], [U],         [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{4}", [U],    [U])

  // Group 17 - VIIA
  elem(right-of("O"),  "F",  "Halogen",   [9 #gas],       [18.998],  [F],  [Fluorine],   [*-1*],         [17.42], "[He] 2s^{2}2p^{5}",              [1.47], [3.401])
  elem(below-of("F"),  "Cl", "Halogen",   [17 #gas],      [35.45],   [Cl], [Chlorine],   [7 5 3 1 *-1*], [12.97], "[Ne] 3s^{2}3p^{5}",              [1.75], [3.613])
  elem(below-of("Cl"), "Br", "Halogen",   [35 #liquid],   [79.904],  [Br], [Bromine],    [7 5 3 1 *-1*], [11.81], "[Ar] 3d^{10}4s^{2}4p^{5}",       [1.85], [3.364])
  elem(below-of("Br"), "I",  "Halogen",   [53 #solid],    [126.904], [I],  [Iodine],     [7 5 1 *-1*],   [10.45], "[Kr] 4d^{10}5s^{2}5p^{5}",       [1.98], [3.059])
  elem(below-of("I"),  "At", "Metalloid", [85 #unk],      [[210]],   [At], [Astatine],   [7 5 3 1 *-1*], [U],     "[Xe] 4f^{14}5d^{10}6s^{2}6p^{5}", [2.02], [2.8])
  elem(below-of("At"), "Ts", "Unknown",   [117 #unk#lab], [[294]],   [Ts], [Tennessine], [U],            [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{5}", [U],    [U])

  // Group 18 - VIIIA
  elem(right-of("F"),  "Ne", "NobleGas", [10 #gas],        [20.180],  [Ne], [Neon],      [*0*],   [21.56], "[He] 2s^{2}2p^{6}",              [1.54], [Ns])
  elem(above-of("Ne"), "He", "NobleGas", [2 #gas],         [4.003],   [He], [Helium],    [*0*],   [24.59], "1s^{2}",                         [1.4],  [Ns])
  elem(below-of("Ne"), "Ar", "NobleGas", [18 #gas],        [39.95],   [Ar], [Argon],     [*0*],   [15.76], "[Ne] 3s^{2}3p^{6}",              [1.88], [Ns])
  elem(below-of("Ar"), "Kr", "NobleGas", [36 #gas],        [83.798],  [Kr], [Krypton],   [*2*],   [14.0],  "[Ar] 3d^{10}4s^{2}4p^{6}",       [2.02], [Ns])
  elem(below-of("Kr"), "Xe", "NobleGas", [54 #gas],        [131.293], [Xe], [Xenon],     [6 4 2], [12.13], "[Kr] 4d^{10}5s^{2}5p^{6}",       [2.16], [Ns])
  elem(below-of("Xe"), "Rn", "NobleGas", [86 #gas],        [[222]],   [Rn], [Radon],     [*2*],   [10.75], "[Xe] 4f^{14}5d^{10}6s^{2}6p^{6}", [2.2],  [Ns])
  elem(below-of("Rn"), "Og", "Unknown",  [118 #unk#radio], [[294]],   [Og], [Oganesson], [U],     [U],     "[Rn] 5f^{14}6d^{10}7s^{2}7p^{6}", [U],    [0.056])

  // Period Labels
  let period-label(target, name, lbl) = {
    content(left-of(target, dist: 2.25), name: name, text(size: 17.28pt)[#lbl])
  }
  period-label("H",  "Period1", [1])
  period-label("Li", "Period2", [2])
  period-label("Na", "Period3", [3])
  period-label("K",  "Period4", [4])
  period-label("Rb", "Period5", [5])
  period-label("Cs", "Period6", [6])
  period-label("Fr", "Period7", [7])

  // Group Labels
  let group-label(target, name, lbl) = {
    content(above-of(target, dist: 2.25), name: name, text(size: 17.28pt)[#lbl])
  }
  group-label("H",  "Group1",  [1 IA])
  group-label("Be", "Group2",  [2 IIA])
  group-label("Sc", "Group3",  [3 IIIA])
  group-label("Ti", "Group4",  [4 IVB])
  group-label("V",  "Group5",  [5 VB])
  group-label("Cr", "Group6",  [6 VIB])
  group-label("Mn", "Group7",  [7 VIIB])
  group-label("Fe", "Group8",  [8 VIIIB])
  group-label("Co", "Group9",  [9 VIIIB])
  group-label("Ni", "Group10", [10 VIIIB])
  group-label("Cu", "Group11", [11 IB])
  group-label("Zn", "Group12", [12 IIB])
  group-label("B",  "Group13", [13 IIIA])
  group-label("C",  "Group14", [14 IVA])
  group-label("N",  "Group15", [15 VA])
  group-label("O",  "Group16", [16 VIA])
  group-label("F",  "Group17", [17 VIIA])
  group-label("He", "Group18", [18 VIIIA])
  content(above-of("Group1", dist: 1.0), name: "Group", text(size: 24.88pt, weight: "bold")[Group])

  // Lanthanides
  elem(below-of("Rf", yshift: -0.5), "La", "Lanthanide", [57 #solid], [138.905], [La], [Lanthanum],    [*3*],   [5.577], "[Xe] 5d^{1}6s^{2}",       [2.43], [0.47])
  elem(right-of("La"),               "Ce", "Lanthanide", [58 #solid], [140.116], [Ce], [Cerium],       [4 *3*], [5.539], "[Xe] 4f^{1}5d^{1}6s^{2}", [2.42], [0.65])
  elem(right-of("Ce"),               "Pr", "Lanthanide", [59 #solid], [140.908], [Pr], [Praseodymium], [4 *3*], [5.473], "[Xe] 4f^{3}6s^{2}",       [2.4],  [0.962])
  elem(right-of("Pr"),               "Nd", "Lanthanide", [60 #solid], [144.242], [Nd], [Neodymium],    [*3*],   [5.525], "[Xe] 4f^{4}6s^{2}",       [2.39], [U])
  elem(right-of("Nd"),               "Pm", "Lanthanide", [61 #solid], [[145]],   [Pm], [Promethium],   [*3*],   [5.582], "[Xe] 4f^{5}6s^{2}",       [2.38], [U])
  elem(right-of("Pm"),               "Sm", "Lanthanide", [62 #solid], [150.36],  [Sm], [Samarium],     [*3* 2], [5.644], "[Xe] 4f^{6}6s^{2}",       [2.36], [U])
  elem(right-of("Sm"),               "Eu", "Lanthanide", [63 #solid], [151.964], [Eu], [Europium],     [*3* 2], [5.67],  "[Xe] 4f^{7}6s^{2}",       [2.35], [0.864])
  elem(right-of("Eu"),               "Gd", "Lanthanide", [64 #solid], [157.25],  [Gd], [Gadolinium],   [*3*],   [6.15],  "[Xe] 4f^{7}5d^{1}6s^{2}", [2.34], [U])
  elem(right-of("Gd"),               "Tb", "Lanthanide", [65 #solid], [158.925], [Tb], [Terbium],      [4 *3*], [5.864], "[Xe] 4f^{9}6s^{2}",       [2.33], [U])
  elem(right-of("Tb"),               "Dy", "Lanthanide", [66 #solid], [162.500], [Dy], [Dysprosium],   [*3*],   [5.939], "[Xe] 4f^{10}6s^{2}",      [2.31], [U])
  elem(right-of("Dy"),               "Ho", "Lanthanide", [67 #solid], [164.930], [Ho], [Holmium],      [*3*],   [6.021], "[Xe] 4f^{11}6s^{2}",      [2.3],  [U])
  elem(right-of("Ho"),               "Er", "Lanthanide", [68 #solid], [167.259], [Er], [Erbium],       [*3*],   [6.108], "[Xe] 4f^{12}6s^{2}",      [2.29], [U])
  elem(right-of("Er"),               "Tm", "Lanthanide", [69 #solid], [168.934], [Tm], [Thulium],      [*3* 2], [6.184], "[Xe] 4f^{13}6s^{2}",      [2.27], [1.029])
  elem(right-of("Tm"),               "Yb", "Lanthanide", [70 #solid], [173.045], [Yb], [Ytterbium],    [*3* 2], [6.254], "[Xe] 4f^{14}6s^{2}",      [2.26], [-0.02])
  elem(right-of("Yb"),               "Lu", "Lanthanide", [71 #solid], [174.967], [Lu], [Lutetium],     [*3*],   [5.426], "[Xe] 4f^{14}5d^{1}6s^{2}", [2.24], [0.34])

  // Actinides
  elem(below-of("La"), "Ac", "Actinide", [89 #solid],     [[227]],   [Ac], [Actinium],     [*3*],       [5.17],  "[Rn] 6d^{1}7s^{2}",       [2.47], [0.35])
  elem(right-of("Ac"), "Th", "Actinide", [90 #solid],     [232.038], [Th], [Thorium],      [*4*],       [6.307], "[Rn] 6d^{2}7s^{2}",       [2.45], [U])
  elem(right-of("Th"), "Pa", "Actinide", [91 #solid],     [231.036], [Pa], [Protactinium], [*5* 4],     [5.89],  "[Rn] 5f^{2}6d^{1}7s^{2}", [2.43], [U])
  elem(right-of("Pa"), "U",  "Actinide", [92 #solid],     [238.029], [U],  [Uranium],      [*6* 5 4 3], [6.194], "[Rn] 5f^{3}6d^{1}7s^{2}", [2.41], [U])
  elem(right-of("U"),  "Np", "Actinide", [93 #solid#lab], [[237]],   [Np], [Neptunium],    [6 *5* 4 3], [6.266], "[Rn] 5f^{4}6d^{1}7s^{2}", [2.39], [U])
  elem(right-of("Np"), "Pu", "Actinide", [94 #solid#lab], [[244]],   [Pu], [Plutonium],    [6 5 *4* 3], [6.026], "[Rn] 5f^{6}7s^{2}",       [2.43], [U])
  elem(right-of("Pu"), "Am", "Actinide", [95 #solid#lab], [[243]],   [Am], [Americium],    [6 5 4 *3*], [5.974], "[Rn] 5f^{7}7s^{2}",       [2.44], [U])
  elem(right-of("Am"), "Cm", "Actinide", [96 #solid#lab], [[247]],   [Cm], [Curium],       [4 *3*],     [5.991], "[Rn] 5f^{7}6d^{1}7s^{2}", [2.45], [U])
  elem(right-of("Cm"), "Bk", "Actinide", [97 #solid#lab], [[247]],   [Bk], [Berkelium],    [4 *3*],     [6.198], "[Rn] 5f^{9}7s^{2}",       [2.44], [U])
  elem(right-of("Bk"), "Cf", "Actinide", [98 #solid#lab], [[251]],   [Cf], [Californium],  [4 *3*],     [6.282], "[Rn] 5f^{10}7s^{2}",      [2.45], [U])
  elem(right-of("Cf"), "Es", "Actinide", [99 #solid#lab], [[252]],   [Es], [Einsteinium],  [*3*],       [6.42],  "[Rn] 5f^{11}7s^{2}",      [2.45], [U])
  elem(right-of("Es"), "Fm", "Actinide", [100 #solid#lab],[[257]],   [Fm], [Fermium],      [*3*],       [6.5],   "[Rn] 5f^{12}7s^{2}",      [2.45], [U])
  elem(right-of("Fm"), "Md", "Actinide", [101 #solid#lab],[[258]],   [Md], [Mendelevium],  [*3*],       [6.58],  "[Rn] 5f^{13}7s^{2}",      [2.46], [U])
  elem(right-of("Md"), "No", "Actinide", [102 #solid#lab],[[259]],   [No], [Nobelium],     [*3* 2],     [6.65],  "[Rn] 5f^{14}7s^{2}",      [2.46], [U])
  elem(right-of("No"), "Lr", "Actinide", [103 #solid#lab],[[262]],   [Lr], [Lawrencium],   [*3*],       [4.9],   "[Rn] 5f^{14}7s^{2}7p^{1}",[2.46], [U])

  // Category Legend Boxes
  let leg-box(pos, id, category, lbl) = {
    let st = styles.at(category)
    rect(
      (rel: (-leg-size / 2, -leg-size / 2), to: pos),
      (rel: (leg-size / 2, leg-size / 2), to: pos),
      name: id,
      radius: leg-rad,
      stroke: st.stroke,
      fill: st.fill,
    )
    content(id, legend-content(lbl))
  }

  leg-box(above-of("Co", dist: leg-step, xshift: 2.0, yshift: 7.0), "alkmet",  "AlkaliMetal",        [Alkali Metal])
  leg-box(below-of("alkmet", dist: leg-step),                       "alkeart", "AlkalineEarthMetal", [Alkaline Earth Metal])
  leg-box(right-of("alkmet", dist: leg-step),                       "tmetal",  "TransMetal",         [Transi-\ tional Metal])
  leg-box(below-of("tmetal", dist: leg-step),                       "metal",   "Metal",              [Post Trans Metal])
  leg-box(below-of("metal",  dist: leg-step),                       "moid",    "Metalloid",          [Metalloid])
  leg-box(right-of("tmetal", dist: leg-step),                       "nonm",    "Nonmetal",           [Non metal])
  leg-box(below-of("nonm",   dist: leg-step),                       "hal",     "Halogen",            [Halogen])
  leg-box(below-of("hal",    dist: leg-step),                       "nob",     "NobleGas",           [Noble gas])
  leg-box(right-of("nonm",   dist: leg-step),                       "lan",     "Lanthanide",         [Lan-\ thanide])
  leg-box(below-of("lan",    dist: leg-step),                       "act",     "Actinide",           [Actinide])
  leg-box(below-of("act",    dist: leg-step),                       "unk",     "Unknown",            [Unknown properties])

  // State & Radioactive/Lab Legend (left-aligned on the symbol)
  content(above-of("Mn", dist: 1.0, xshift: 2.0, yshift: 8.5), anchor: "west", name: "solid-leg",  text(size: 20pt)[#solid solid\@273K])
  content(below-of("solid-leg.west",  dist: 1.0),              anchor: "west", name: "gas-leg",    text(size: 20pt)[#gas gas\@273K])
  content(below-of("gas-leg.west",    dist: 1.0),              anchor: "west", name: "liquid-leg", text(size: 20pt)[#liquid liquid\@273K])
  content(below-of("liquid-leg.west", dist: 1.0),              anchor: "west", name: "unkn-leg",   text(size: 20pt)[#unk unknown])
  content(below-of("unkn-leg.west",   dist: 1.0, yshift: -1.0),anchor: "west", name: "radio-leg",  text(size: 20pt)[#radio radioactive])
  content(below-of("radio-leg.west",  dist: 1.0),              anchor: "west", name: "lab-leg",    text(size: 20pt)[#lab lab made])

  // Sample Element (Technetium) & Callout Labels
  let leg-scale = 1.5
  elem(
    right-of("Be", dist: elem-step, xshift: 5.5, yshift: 2.5),
    "legend",
    "TransMetal",
    [43 #solid #lab #radio], [[98]], [Tc], [Technetium], [*7*], [7.1194], "[Kr]4d^55s^2", [2.16], [0.55],
    scale-factor: leg-scale,
  )

  content(
    (rel: (0.25, 0), to: "legend.east"),
    anchor: "west",
    name: "legend-right-labels",
    block(inset: 0pt, {
      set text(size: 10pt * leg-scale)
      set align(left)
      set par(leading: 0.42em, spacing: 0.42em)
      [oxidation states \ ]
      [*1st ionisation energy[eV]* \ ]
      [*affinity[eV]* \ ]
      [#text(size: 20.74pt * leg-scale, weight: "bold")[symbol] \ ]
      [*name* \ ]
      [ground state configuration]
    }),
  )

  content(
    (rel: (-0.25, 0), to: "legend.west"),
    anchor: "east",
    name: "legend-left-labels",
    block(inset: 0pt, {
      set text(size: 10pt * leg-scale)
      set align(right)
      set par(leading: 0.42em, spacing: 0.42em)
      [*atomic number* \ ]
      [*relative atomic mass[Da]* \ ]
      [*atomic radius[Å]* \ ]
      [#std.hide(text(size: 20.74pt * leg-scale, weight: "bold")[Tc]) \ ]
      [#std.hide[*Technetium*] \ ]
      [#std.hide(fmt-conf("[Kr]4d^55s^2"))]
    }),
  )

  // Footer
  content(below-of("Ra", dist: 1.0, yshift: -7.0), name: "f1", [more info https://www.rsc.org/periodic-table])
  content(below-of("f1", dist: 1.0, yshift: 0.5),  name: "f2", [source and raw data at https://gitlab.com/drFaustroll/periodic])

  // Title and Period Axis Label positioned at canvas bounding box north and west
  content((29.0, 3.6), anchor: "south", text(size: 49.76pt, weight: "bold")[Periodic Table of Elements])
  content((-2.6, -13.26), angle: 90deg, anchor: "south", text(size: 24.88pt, weight: "bold")[Period])
})

#context {
  if page.flipped {
    layout(avail => {
      let dim = measure(periodic-canvas)
      let sx = avail.width / dim.width
      let sy = avail.height / dim.height
      let s = calc.min(sx, sy) * 100%
      block(
        width: 100%,
        height: 100%,
        align(center + horizon, scale(s, reflow: true, periodic-canvas)),
      )
    })
  } else {
    set page(width: auto, height: auto, margin: 5mm, numbering: none, fill: page-fill)
    align(center + horizon, periodic-canvas)
  }
}
