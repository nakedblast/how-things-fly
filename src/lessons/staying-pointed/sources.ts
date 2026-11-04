import type { Source } from '../../book/lesson/kit'

export const SOURCES: readonly Source[] = [
  {
    label: 'NASA Glenn Research Center: Rocket Stability',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-stability/',
    note: 'a flying body is stable when the centre of pressure lies behind the centre of gravity; nose weight or bigger fins help',
  },
  {
    label: 'J. S. and J. A. Barrowman, The Theoretical Prediction of the Center of Pressure (NARAM-8, 1966), Museum of Flight archive',
    url: 'https://archives.museumofflight.org/repositories/2/resources/579',
    note: 'the method the lesson uses to find each dart’s push point',
  },
  {
    label: 'C. Cohen, B. Darbois Texier, D. Quéré and C. Clanet, “The physics of badminton”, New Journal of Physics 17, 063001 (2015)',
    url: 'https://iopscience.iop.org/article/10.1088/1367-2630/17/6/063001',
    note: 'shuttlecock about 5 g, drag coefficient 0.65, centre of mass about 3.0 cm ahead of the centre of pressure; it flips in typically 20 ms',
  },
  {
    label: 'BWF Laws of Badminton, Law 2: the shuttle (worldbadminton.com)',
    url: 'https://worldbadminton.com/laws/index.html',
    note: '16 feathers, 62–70 mm long, tips on a circle 58–68 mm across; cork base 25–28 mm; 4.74–5.50 g. The lesson’s skirt is 64 mm',
  },
]
