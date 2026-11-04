import type { Source } from '../../book/lesson/kit'

export const SPHERE_SOURCE: Source = {
  label: 'FAA, AC 450.115-1A (24 June 2021), §9.2.1, Table 1',
  url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_450.115-1A.pdf',
  note: 'Proving-ground subcritical-sphere Cd(Mach): 0.52 at 0.6, 0.64 at 0.8, 0.73 at 0.9, 0.82 at 1, 1.05 at 1.4, 1 at 2, 0.93 at 4, 0.92 at 10; linearly interpolated. The range keeps 0.47 through Mach 0.5 and joins the table at 0.6. This fixed flow-regime reference omits Reynolds-number variation.',
}

export const SOURCES: readonly Source[] = [
  { label: 'R. L. McCoy, Modern Exterior Ballistics (Schiffer, 1999), §8.8', url: 'https://search.worldcat.org/search?q=bn:0764307207', note: '106 kg, 210 mm, 50° elevation, latitude 49.5° N, azimuth 232°; rounded muzzle speed 5,400 ft/s (about 1,646 m/s); calculated Coriolis miss 1,343 m right and 393 m short. Model geometry and Earth-rotation rate follow the existing physics core.' },
  { label: 'Bull & Murphy (1988), via Wikipedia: Paris Gun, Description', url: 'https://en.wikipedia.org/wiki/Paris_Gun#Description', note: 'Secondary: 1,640 m/s, about 120 km service distance and 130 km maximum, 182 s flight and 42.3 km peak. Specifications elsewhere give 55° rather than McCoy’s 50°. Historical values do not describe one verified shot.' },
  { label: 'David T. Zabecki, Paris Under the Gun (2017)', url: 'https://historynet.com/paris-under-the-gun/', note: '177 s and 138,800 ft (about 42.3 km): corroboration for the flight’s approximate duration and height.' },
  { label: 'JBM Ballistics / US Ballistic Research Laboratory: G7 table', url: 'https://jbmballistics.com/downloads/mcg7.txt', note: 'Fifteen unscaled Cd(Mach) reference-shape points, Mach 0.5–5; G7 is not measured Paris Gun drag.' },
  { label: 'JBM Downloads: table provenance', url: 'https://jbmballistics.com/downloads.html', note: 'Identifies the Ballistic Research Laboratory as the drag-table source.' },
  { label: 'Bryan Litz, Aerodynamic Drag Modeling for Ballistics (2021), pp.3–4', url: 'https://appliedballisticsllc.com/wp-content/uploads/2021/06/Aerodynamic-Drag-Modeling-for-Ballistics.pdf', note: 'G7 coefficients use frontal cross-sectional area as the reference.' },
  { label: 'U.S. Standard Atmosphere, 1976', url: 'https://ntrs.nasa.gov/citations/19770009539', note: 'The density and sound-speed profiles; all displayed densities at 0, 10, 20 and 40 km are calculated by the repository’s standard-atmosphere implementation. Its tropopause begins at 11 km geopotential altitude.' },
  { label: 'William Scheck, World War I Weapons: Germany’s Big Guns (2002)', url: 'https://warfarehistorynetwork.com/article/world-war-i-weapons-germanys-big-guns/', note: 'Secondary evidence that gunners allowed for Earth rotation. The article’s numerical correction is not used; its latitude passage is inconsistent.' },
  { label: 'NASA Glenn: Drag Coefficient', url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-coefficient/', note: 'Supersonic shock waves add wave drag; low-speed drag coefficients cannot simply be reused.' },
  { label: 'NASA, High-Flying Peeps activity guide', url: 'https://www.nasa.gov/wp-content/uploads/2023/05/high-flying-peeps-activity-guide.pdf', note: 'Commercial airliners usually cruise near 12 km (40,000 ft): the side-profile height reference.' },
  { label: 'Ortiz, Ando & Miyazaki, Numerical Simulation of Wind Drift of Arrows on the Olympic Venue for Tokyo 2020 (2020)', url: 'https://www.athensjournals.gr/sports/2019-3196-AJSPO-FIT-Ortiz-04.pdf', note: 'A 70 m Olympic shot in a steady 3 m/s side wind drifts about 0.35 m (their type-A arrow).' },
  SPHERE_SOURCE,
]
