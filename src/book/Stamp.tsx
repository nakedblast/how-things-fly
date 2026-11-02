import type { Lesson } from './lessons'

interface Props {
  lesson: Lesson
  earned: boolean
  size?: number
}

/** An ink stamp for a lesson's qualification; an empty dashed ring until it is earned. */
export function Stamp({ lesson, earned, size = 112 }: Props) {
  // A small, fixed tilt per lesson so a page of stamps looks hand-pressed.
  const tilt = ((lesson.number * 37) % 15) - 7
  const pathId = `stamp-arc-${lesson.id}`
  const label = earned
    ? `Stamp for lesson ${lesson.number}, ${lesson.title}: earned`
    : `Stamp for lesson ${lesson.number}, ${lesson.title}: not yet earned`

  return (
    <svg
      className={earned ? 'stamp stamp-earned' : 'stamp'}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={label}
    >
      <g transform={earned ? `rotate(${tilt} 60 60)` : undefined}>
        <circle cx="60" cy="60" r="54" className="stamp-ring" strokeWidth={earned ? 4 : 2} />
        {earned && <circle cx="60" cy="60" r="38" className="stamp-ring" strokeWidth="1.5" />}
        <text x="60" y="72" textAnchor="middle" className="stamp-number">
          {lesson.number}
        </text>
        {earned && (
          <>
            <path id={pathId} d="M 18 60 A 42 42 0 0 1 102 60" fill="none" />
            <text className="stamp-title">
              <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                {shortTitle(lesson.title).toUpperCase()}
              </textPath>
            </text>
            <text x="60" y="100" textAnchor="middle" className="stamp-foot">
              QUALIFIED
            </text>
          </>
        )}
      </g>
    </svg>
  )
}

function shortTitle(title: string): string {
  return title.split(':')[0]
}
