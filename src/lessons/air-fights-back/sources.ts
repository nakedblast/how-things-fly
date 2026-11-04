import type { Source } from '../../book/lesson/kit'

export const SOURCES: readonly Source[] = [
  {
    label: 'NASA Glenn Research Center: The Drag Equation',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/',
    note: 'drag depends on air density and the square of the speed',
  },
  {
    label: 'NASA Glenn Research Center: Shape Effects on Drag',
    url: 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/',
    note: 'drag coefficient of a sphere; every ball here uses 0.47, a smooth sphere',
  },
  {
    label: 'U.S. Standard Atmosphere, 1976',
    url: 'https://ntrs.nasa.gov/citations/19770009539',
    note: 'sea-level air density 1.225 kg/m³; the density one mile up (about 1.05 kg/m³) is computed from it',
  },
  {
    label: 'Tennis ball (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Tennis_ball',
    note: 'ITF specification: 56.0–59.4 g, 6.54–6.86 cm; the lesson uses 57.7 g and 6.7 cm',
  },
  {
    label: 'Table Tennis England: Laws of Table Tennis 2026–27',
    url: 'https://www.tabletennisengland.co.uk/content/uploads/2026/07/Laws-of-Table-Tennis-2026-27.pdf',
    note: 'reproduced from the ITTF; Law 2.3: the ball is 40 mm across and weighs 2.7 g',
  },
  {
    label: 'MLB Official Baseball Rules: Rule 3.01',
    url: 'https://mktg.mlbstatic.com/mlb/official-information/2026-official-baseball-rules.pdf',
    note: 'the range ball is baseball-sized: 0.145 kg and 74 mm',
  },
  {
    label: 'Denver (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Denver',
    note: 'official elevation exactly one mile (1,609 m) above sea level',
  },
  {
    label: 'Two New Sciences (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Two_New_Sciences',
    note: 'Galileo, 1638: the parabola, and air resistance affecting light and fast bodies more',
  },
  {
    label: 'Benjamin Robins (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Benjamin_Robins',
    note: 'New Principles of Gunnery, 1742: the ballistic pendulum and experiments on air resistance',
  },
]
