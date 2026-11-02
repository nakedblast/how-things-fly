import type { Source } from '../../book/lesson/kit'

export const SOURCES: readonly Source[] = [
  {
    label: 'NIST: standard acceleration of gravity, 9.80665 m/s²',
    url: 'https://physics.nist.gov/cgi-bin/cuu/Value?gn',
    note: 'the value of g used in every simulation',
  },
  {
    label: 'Theory of impetus (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Theory_of_impetus',
    note: 'medieval impetus theory',
  },
  {
    label: 'Niccolò Fontana Tartaglia (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Niccol%C3%B2_Fontana_Tartaglia',
    note: 'Nova Scientia, 1537, and its trajectory drawings',
  },
  {
    label: 'Two New Sciences (Wikipedia)',
    url: 'https://en.wikipedia.org/wiki/Two_New_Sciences',
    note: 'Galileo, 1638: projectile paths are parabolas',
  },
]
