import { Flap } from '../../book/lesson/kit'
import { standardAtmosphere } from '../../physics/atmosphere'
import type { LongShot } from './scenario'

export function ExplainRotation() {
  return (
    <p>
      The ground under the shell is turning with the Earth. In three minutes the gun and the marker each travel more
      than 50 km east, but not at quite the same speed, and the shell keeps the motion it left with. Seen from the
      ground, the shell drifts sideways: to the right of its path in the northern half of the world, to the left in the
      southern.
    </p>
  )
}

export function ExplainAir() {
  return (
    <p>
      The shell climbed out of the thick air on purpose. Much of its flight was spent above 20 km, where the air is
      less than a tenth as thick as at the ground, so it kept its speed. Fired through sea-level air all the way, the
      same shell would come down after about 34 km, not 120. Lesson 3’s lower best angle assumed the air was the same
      all the way up.
    </p>
  )
}

export function ExplainWind() {
  return (
    <p>
      The shell drifts with the air it flies through: a crosswind carries it sideways, a headwind shortens it. An
      Olympic arrow shot 70 m in a gentle side wind drifts about 35 cm; a shell three minutes in the air drifts
      hundreds of metres. Real winds change with height; this range keeps one steady wind so you can tell it apart from
      the Earth’s push.
    </p>
  )
}

export function Explain({ shot }: { shot: LongShot }) {
  const densities = [0, 10, 20, 40].map((km) => {
    const density = standardAtmosphere(km * 1000).density
    return { km, density, share: (density / standardAtmosphere(0).density) * 100 }
  })
  return (
    <>
      <Flap title="The ground moves while the shell flies" open>
        <ExplainRotation />
      </Flap>
      <Flap title="Why it flew so high">
        <ExplainAir />
      </Flap>
      <Flap title="Wind">
        <ExplainWind />
      </Flap>
      <Flap title="Why “aim straight at it” seemed right">
        <p>
          For almost everything people had ever thrown or fired, it was right. The Earth’s turning moves a ball that is
          two seconds in the air by less than a centimetre, far less than a gust of wind or an unsteady hand. The push
          builds up with time in the air, so it only shows when a flight lasts minutes.
        </p>
        <p>
          The Paris Gun of 1918 was the first gun whose shells stayed up that long, about three minutes, climbing
          more than three times as high as airliners fly. Its crew had to allow for the Earth’s turning. This lesson
          borrows the shell’s size and speed; its markers stand on an empty, made-up test range.
        </p>
        <Flap title="Historical figures" deeper>
          <p>
            McCoy’s worked example uses a 106 kg shell, 210 mm across, fired at 50° from latitude 49.5° N on a bearing
            of 232°. Other accounts give 55°. The muzzle speed here is 1,640 m/s; McCoy rounds it to about 1,646 m/s.
          </p>
          <p>
            Accounts give about 120 km to the target, about 130 km at most, about 180 s in the air and a peak near
            42 km. They are not measurements of one documented shot. McCoy calculates that the Earth’s turning moved
            the shell 1,343 m right and 393 m short; this model gives {Math.round(shot.drift).toLocaleString('en-GB')} m
            right.
          </p>
        </Flap>
      </Flap>
      <Flap title="Faster than sound">
        <p>
          The shell left the gun at nearly five times the speed of sound. Faster than sound, the air cannot move aside
          smoothly: it piles up into a shock wave, which adds a lot of drag. So the shell’s drag changes as it slows
          down, and the model uses a published drag curve that changes with speed. Lesson 9, The sound barrier, will
          look at this closely.
        </p>
      </Flap>
      <Flap title="The numbers" deeper>
        <p>
          Sideways push from the Earth’s turning, per kilogram: 2 × Ω × v × sin(latitude), where Ω = 7.292 × 10⁻⁵
          radians per second is the Earth’s turning rate and v the speed. The simulation also includes the smaller
          up-and-down and direction-dependent parts.
        </p>
        <p>
          For an everyday throw at 30 m/s, two seconds in the air, even at the pole: ½ × 2Ω × v × t² ≈ 0.009 m, about
          9 mm.
        </p>
        <p>
          Your shot: {shot.flight.flightTime.toFixed(0)} s in the air, peak {(shot.apexHeight / 1000).toFixed(1)} km,
          landing {(shot.range / 1000).toFixed(2)} km downrange and {Math.round(shot.drift)} m right of the line.
        </p>
        <p>Air density in the standard atmosphere:</p>
        <ul>
          {densities.map(({ km, density, share }) => (
            <li key={km}>
              {km} km: {density.toFixed(4)} kg/m³, {share.toFixed(1)}% of sea level
            </li>
          ))}
        </ul>
        <p>
          The drag curve is the standard G7 table for a pointed, boat-tailed reference shape, not measured Paris Gun
          drag. Spin and winds that change with height are left out. Airliners cruise near 12 km; the stratosphere
          starts near 11 km.
        </p>
      </Flap>
    </>
  )
}
