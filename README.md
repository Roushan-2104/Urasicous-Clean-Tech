# Urasicous Clean Tech

**Empowering rural communities through next-gen solar microgrids.**

A landing page and live, simulated control-room dashboard for a community solar microgrid serving 50 households in Rampur Kheda, a farming village 38 km from Nashik, Maharashtra.

---

## Credits

| | |
| --- | --- |
| **Project** | **Team Pioneering Sol-Gen**, for HCL Jigsaw (Edition 7 · Grade 9 · Climate Action & Sustainable Energy) |
| **Website** | Built by **Roushan** ([@Roushan-2104](https://github.com/Roushan-2104)) |

The microgrid project belongs to Team Pioneering Sol-Gen: the village research, load calculations, system sizing, cost analysis, distribution sketch, governance model and pitch. All of it comes from the team's worksheet, which is included as [`assets/Village-Microgrid-Project-Report.pptx`](assets/Village-Microgrid-Project-Report.pptx).

This repository only presents the team's work as a website. I designed and built the site; the project ideas, research and content are theirs.

---

## The project at a glance

| | |
| --- | --- |
| Village | Rampur Kheda, 38 km from Nashik: 2,400 people, 480 households |
| Problem | 4–6 hours of power cuts a day (up to 8 in summer); families rely on diesel generators |
| Phase one | 50 households on a community-owned microgrid |
| Solar array | 40 kWp: 80 × 500 W high-efficiency monocrystalline panels, 15° south tilt |
| Storage | 90 kWh LiFePO4 battery energy storage (BESS) with a Microgrid Central Controller (MGCC) |
| Distribution | Armoured underground/overhead cables, smart prepaid meters, MCBs and ELCBs per home |
| Daily requirement | 188.64 kWh/day (5-household survey average × 50, plus 20% community loads) |
| Gross cost | ₹36.1 lakh |
| Per-household contribution | ₹1,200, one time |
| Payback | Under 3 years (projected) |

---

## What's on the site

1. **Hero**: company name, tagline, and a stack of section "folders". The front folder shows live figures from the simulation, with *Explore live dashboard* and *View project proposal* buttons.
2. **The Rampur Kheda Initiative**: the village profile, key-figure tiles, and the 5-household load table behind the system sizing.
3. **Live microgrid dashboard**: a simulated control room (details below).
4. **Generate, store, distribute**: an expandable three-stage view of the hardware.
5. **Financial transparency**: the itemised market bill, then the funding flow from the 60% government subsidy, through CSR/state grants, to the ₹1,200 household share.
6. **Run by the village**: the Village Electricity Committee and answers to the tough pitch questions (monsoon, non-payment, maintenance).
7. **Prototype & innovation**: the hand-drawn sketch plan, the cardboard prototype, the material cost bill, and a download of the project report.
8. **Footer**: © 2026 Urasicous Clean Tech | Developed with passion by Team Pioneering Sol-Gen for HCL Jigsaw.

### Design

The page uses one shape throughout: the clipped-corner square of a monocrystalline solar cell. It shapes the buttons, tabs, image masks and tiles. In the dashboard, the 50 households are laid out as the 50 cells of a single solar panel. The palette is deep forest green, crisp white and slate grey, with solar yellow as the accent. All type is set in [Jost](https://fonts.google.com/specimen/Jost).

---

## The live dashboard

The dashboard runs a simulated day in one-minute steps. Every number on screen comes from the same model, so the totals always agree.

- **Solar generation**: a sun curve between about 06:15 and 18:45 for a 40 kWp array at 82% system efficiency, with drifting cloud cover.
- **Household loads**: built from the five surveyed household types (farming, shop, dairy, flour mill, daily-wage), using their real appliance wattages and hours, spread across the 50 homes.
- **Battery (LiFePO4, 90 kWh)**: charges from surplus solar, keeps a 20% reserve, 92% round-trip efficiency.
- **Grid cuts**: modelled from 14:00–18:00 and 21:00–23:00. During a cut the microgrid islands and the battery carries the village.
- **Net metering**: once the battery passes 90%, surplus is exported, and daily earnings tick up at ₹3.10/kWh.
- **Household grid**: 50 smart prepaid meters (House #01–#50), showing live draw and balance. Click any house to read its meter. Two homes start with a low balance to show the recharge warning.

Controls: **Real time**, **1 min / sec** (default) or **Day in 2 min**.

> All dashboard data is simulated for demonstration. The export tariff (₹3.10/kWh), prepaid tariff (₹5.00/kWh) and cut schedule are modelling assumptions, not measured figures.

---

## Running it

The site is plain HTML, CSS and JavaScript, with no build step and no dependencies.

```bash
git clone https://github.com/Roushan-2104/Urasicous-Clean-Tech.git
cd Urasicous-Clean-Tech
```

Then open `index.html` in a browser. Or serve the folder locally:

```bash
python -m http.server 8000
# open http://localhost:8000
```

### Publishing on GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`.
3. The site will be live at `https://roushan-2104.github.io/Urasicous-Clean-Tech/`.

---

## Project structure

```
├── index.html      # all page sections
├── styles.css      # design tokens, layout, responsive rules
├── app.js          # microgrid simulation, dashboard rendering, interactions
└── assets/
    ├── Village-Microgrid-Project-Report.pptx   # the team's project worksheet
    ├── sketch-plan.jpg                          # the team's hand-drawn distribution layout
    ├── credits.json                             # source and licence of every photo
    └── *.jpg                                    # openly licensed photographs (see below)
```

---

## Notes on the figures

- The headline figures (50 homes, 40 kWp, 90 kWh, ₹36.1 lakh, ₹1,200, under 3 years) follow the project brief. The village profile, load survey, battery specifications, governance model and pitch answers come from the team's worksheet.
- The worksheet also contains a larger, whole-village design (480 homes, 377 kWp, about ₹1.95 crore). The website presents the 50-household first phase.
- The itemised bill splits the ₹36.1 lakh across components at estimated market rates. The 60% subsidy is applied to the gross cost, and CSR/state grants cover the balance above the households' ₹60,000 share.
- The cardboard prototype is shown as a drawing, and the prototype material bill (₹900) is a sample. Both should be replaced with the team's real photo and bill.

---

## Image credits

The photographs show the wider world of the project, not the project itself. All are from Wikimedia Commons under open licences:

- "Traditional House Solar Zamtang Zanskar" by Timothy A. Gonsalves, [CC BY-SA 4.0](https://commons.wikimedia.org/w/index.php?curid=152914959)
- "Anjenari village, Nashik" by Mahi29, [CC BY-SA 4.0](https://commons.wikimedia.org/w/index.php?curid=42551914)
- "Rooftop solar power plant" by Oleg Savitsky, [CC BY-SA 4.0](https://commons.wikimedia.org/w/index.php?curid=44112543)
- "Logarex smart household electricity meter" by RobbieIanMorrison, [CC BY 4.0](https://commons.wikimedia.org/wiki/File:Logarex_smart_household_electricity_meter_build_year_2023.jpg)
- "Solar panels closeup" by Jollyroger, [CC BY-SA 2.5](https://commons.wikimedia.org/wiki/File:Solar_panels_closeup.jpg)
- "Bird's eye view of Nashik city from the Pandavlena Caves" by Anannyadeb, [CC BY-SA 3.0](https://commons.wikimedia.org/w/index.php?curid=28498936)

The sketch plan and project report are the work of Team Pioneering Sol-Gen.

---

© 2026 Urasicous Clean Tech | Developed with passion by Team Pioneering Sol-Gen for HCL Jigsaw.
