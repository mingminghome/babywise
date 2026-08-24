import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import {
  fruitNameKey,
  type FruitExtra,
  type FruitId,
  type FruitLook,
  type FruitShape,
} from '../core/pregnancy/fruitSize';
import {
  FruitMascot,
  MASCOT_ARM_LEN,
  MASCOT_FALLBACK_LAYOUT,
  MASCOT_GROUND_Y,
  MASCOT_LEG_LEN,
  anchorsFromGeometry,
  bodyPathD,
  type MascotLayout,
  type MascotMood,
} from '../core/pregnancy/mascot';
import type { TFunction } from '../core/i18n';

export type { MascotMood };

const FACE = '#4a342e';
const BLUSH = '#f0b4b4';
const STICK = '#2b2224';

type Props = {
  week: number;
  t: TFunction;
};

function steps(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n += step) out.push(n);
  return out;
}

/**
 * Renders a FruitMascot: shadow, body+pattern, accessories, stick limbs, face.
 * Size follows gestational week (seed → watermelon).
 */
export function BabyFruitMascot({ week, t }: Props) {
  const mascot = useMemo(() => new FruitMascot(week), [week]);
  const look = mascot.look;
  const uid = useId().replace(/:/g, '');
  const bodyGrad = `fruit-body-${uid}`;
  const clipId = `fruit-clip-${uid}`;
  const bodyRef = useRef<SVGPathElement>(null);
  const [layout, setLayout] = useState<MascotLayout>(MASCOT_FALLBACK_LAYOUT);
  const footY = Math.max(layout.legL.y, layout.legR.y) + MASCOT_LEG_LEN;
  const groupY = MASCOT_GROUND_Y - footY;
  const name = t(`home.fruit.names.${fruitNameKey(look.id)}`);
  const caption =
    look.id === 'beginning'
      ? t('home.fruit.justBeginning')
      : t('home.fruit.sizeOf', { fruit: name });
  const moodLabel = t(`home.fruit.mood.${mascot.mood}`);
  const face = mascot.facePose();

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const next = anchorsFromGeometry(el, look.shape);
    if (next) setLayout(next);
  }, [look.shape]);

  return (
    <figure
      className="baby-fruit"
      data-mood={mascot.mood}
      data-week={mascot.week}
      title={`${caption} · ${moodLabel}. ${t('home.fruit.funHint')}`}
      style={{ '--mascot-size': `${mascot.displayPx}px` } as CSSProperties}
    >
      <svg
        className="baby-fruit-svg mascot"
        viewBox="0 0 200 188"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={bodyGrad} cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor={look.fillLight} />
            <stop offset="52%" stopColor={look.fill} />
            <stop offset="100%" stopColor={look.fillDark} />
          </radialGradient>
        </defs>

        <ellipse
          className="mascot-shadow baby-fruit-shadow"
          cx="100"
          cy={MASCOT_GROUND_Y + 6}
          rx={18 + 22 * mascot.scale}
          ry={4 + 3 * mascot.scale}
          fill="rgba(90, 60, 50, 0.18)"
        />

        <g
          className="mascot-stage plush-stage"
          transform={`translate(100 ${groupY}) rotate(${mascot.tiltDeg()} 0 ${footY})`}
        >
          {/* Clip lives in the same user space as the body, so patterns fill it. */}
          <clipPath id={clipId}>
            <BodyPath shape={look.shape} />
          </clipPath>

          <g className="mascot-legs" transform={`translate(${layout.legL.x} ${layout.legL.y})`}>
            <g className="mascot-limb plush-leg plush-leg-l">
              <StickLimb kind="leg" />
            </g>
          </g>
          <g className="mascot-legs" transform={`translate(${layout.legR.x} ${layout.legR.y})`}>
            <g className="mascot-limb plush-leg plush-leg-r">
              <StickLimb kind="leg" />
            </g>
          </g>

          <g className="mascot-body plush-body">
            <BodyPath
              shape={look.shape}
              fill={`url(#${bodyGrad})`}
              pathRef={bodyRef}
            />
            <g className="mascot-pattern" clipPath={`url(#${clipId})`}>
              <PlushGrain />
              <SurfacePattern look={look} />
            </g>
            {look.shape !== 'pepper' && look.shape !== 'curve' && (
              <ellipse
                cx="-16"
                cy="-18"
                rx="16"
                ry="10"
                fill="#fff"
                opacity="0.14"
              />
            )}
          </g>

          <g className="mascot-head">
            <Accessories look={look} />
          </g>

          <g className="mascot-arms" transform={`translate(${layout.armL.x} ${layout.armL.y})`}>
            <g className="mascot-limb plush-arm plush-arm-l">
              <StickLimb kind="arm" />
            </g>
          </g>
          <g className="mascot-arms" transform={`translate(${layout.armR.x} ${layout.armR.y})`}>
            <g className="mascot-limb plush-arm plush-arm-r">
              <StickLimb kind="arm" />
            </g>
          </g>

          <g
            className="mascot-face-wrap"
            transform={`translate(${face.x} ${face.y}) scale(${face.scale})`}
          >
            <Face mood={mascot.mood} />
          </g>
        </g>
      </svg>
      <figcaption className="baby-fruit-caption">{caption}</figcaption>
    </figure>
  );
}

/** Pointed leaf blade (tip up, round base). */
function LeafBlade({ fill, transform }: { fill: string; transform?: string }) {
  return (
    <path
      d="M0 16 C12 4 14 -10 0 -30 C-14 -10 -12 4 0 16 Z"
      fill={fill}
      transform={transform}
    />
  );
}

function StickLimb({ kind }: { kind: 'arm' | 'leg' }) {
  const len = kind === 'arm' ? MASCOT_ARM_LEN : MASCOT_LEG_LEN;
  return (
    <line
      x1={0}
      y1={0}
      x2={0}
      y2={len}
      stroke={STICK}
      strokeWidth={kind === 'arm' ? 2.4 : 2.6}
      strokeLinecap="round"
    />
  );
}

function Face({ mood }: { mood: MascotMood }) {
  const asleep = mood === 'sleep';
  return (
    <g className="mascot-face plush-face" aria-hidden>
      <ellipse className="plush-blush" cx="-16" cy="6" rx="8" ry="5" fill={BLUSH} />
      <ellipse className="plush-blush" cx="16" cy="6" rx="8" ry="5" fill={BLUSH} />
      {asleep ? (
        <>
          <path
            d="M-17-1 q6 7 12 0"
            fill="none"
            stroke={FACE}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M5-1 q6 7 12 0"
            fill="none"
            stroke={FACE}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M-4 13 Q0 15 4 13"
            fill="none"
            stroke={FACE}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <g className="plush-zzz" fill={FACE}>
            <text className="plush-z" x="26" y="-18" fontSize="11">
              z
            </text>
            <text className="plush-z" x="36" y="-32" fontSize="13">
              z
            </text>
            <text className="plush-z" x="48" y="-48" fontSize="16">
              z
            </text>
          </g>
        </>
      ) : (
        <>
          <g transform="translate(-11 0)">
            <ellipse className="plush-eye" cx="0" cy="0" rx="4.2" ry="5.4" fill={FACE} />
            <circle cx="1.4" cy="-1.8" r="1.35" fill="#fff" />
          </g>
          <g transform="translate(11 0)">
            <ellipse
              className="plush-eye"
              cx="0"
              cy="0"
              rx="4.2"
              ry="5.4"
              fill={FACE}
              style={{ animationDelay: '0.06s' }}
            />
            <circle cx="1.4" cy="-1.8" r="1.35" fill="#fff" />
          </g>
          <path
            className="plush-smile"
            d={mood === 'smile' ? 'M-8 11 Q0 20 8 11' : 'M-6 12 Q0 17.5 6 12'}
            fill="none"
            stroke={FACE}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  );
}

function BodyPath({
  shape,
  fill,
  pathRef,
}: {
  shape: FruitShape;
  fill?: string;
  pathRef?: Ref<SVGPathElement>;
}) {
  return (
    <path ref={pathRef} d={bodyPathD(shape)} fill={fill ?? 'none'} stroke="none" />
  );
}

/** Soft plush grain across the whole silhouette (not just the face). */
function PlushGrain() {
  return (
    <g fill="#fff" opacity="0.16">
      {steps(-48, 48, 12).flatMap((y, yi) =>
        steps(-52, 52, 14).map((x) => (
          <circle
            key={`${x}-${y}`}
            cx={x + (yi % 2 === 0 ? 0 : 7)}
            cy={y}
            r="1.15"
          />
        ))
      )}
    </g>
  );
}

function SurfacePattern({ look }: { look: FruitLook }) {
  return (
    <>
      {look.extras.map((extra) => (
        <SurfaceExtra key={extra} extra={extra} look={look} />
      ))}
    </>
  );
}

/** Patterns drawn oversized, then clipped to the body. */
function SurfaceExtra({ extra, look }: { extra: FruitExtra; look: FruitLook }) {
  const a = look.accent;
  switch (extra) {
    case 'stripes':
      return (
        <g fill={a} opacity="0.38">
          {steps(-48, 48, 16).map((x) => (
            <rect key={x} x={x - 6} y={-80} width={12} height={170} rx="6" />
          ))}
        </g>
      );
    case 'net':
      return (
        <g fill="none" stroke={a} strokeWidth="1.35" opacity="0.4">
          {steps(-56, 56, 14).map((y) => (
            <path key={`h${y}`} d={`M-70 ${y} q70 12 140 0`} />
          ))}
          {steps(-48, 48, 18).map((x) => (
            <path key={`v${x}`} d={`M${x} -70 q${x < 0 ? 8 : -8} 80 0 150`} />
          ))}
        </g>
      );
    case 'ribs':
      return (
        <g fill={a} opacity="0.22">
          {steps(-36, 36, 18).map((x) => (
            <ellipse key={x} cx={x} cy="4" rx="9" ry="70" />
          ))}
        </g>
      );
    case 'seeds':
      return (
        <g fill="#f4e8a8" opacity="0.9">
          {steps(-28, 40, 12).flatMap((y, yi) =>
            steps(-36, 36, 14).map((x) => (
              <ellipse
                key={`${x}-${y}`}
                cx={x + (yi % 2 === 0 ? 0 : 7)}
                cy={y}
                rx="2.1"
                ry="3.2"
              />
            ))
          )}
        </g>
      );
    case 'florets':
      return (
        <g>
          <g fill={look.fillDark} opacity="0.22">
            {[
              [-16, -16, 15],
              [14, -18, 14],
              [0, -28, 13],
              [20, -2, 13],
              [-22, 2, 13],
              [6, 10, 14],
              [-10, 16, 12],
              [16, 18, 12],
            ].map(([cx, cy, r]) => (
              <circle key={`g${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
          <g fill={look.fillLight} opacity="0.9">
            {[
              [-12, -20, 11],
              [12, -22, 11],
              [2, -30, 10],
              [18, -6, 10],
              [-20, -2, 10],
              [6, 6, 11],
              [-8, 14, 9],
              [14, 16, 9],
              [0, 4, 9],
            ].map(([cx, cy, r]) => (
              <circle key={`h${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
        </g>
      );
    case 'layers':
      return (
        <g fill="none" stroke={a} strokeWidth="2.2" opacity="0.32">
          <ellipse cx="0" cy="2" rx="46" ry="44" />
          <ellipse cx="0" cy="6" rx="34" ry="32" />
          <ellipse cx="0" cy="10" rx="22" ry="20" />
        </g>
      );
    case 'hair':
      return (
        <g stroke={a} strokeWidth="2" strokeLinecap="round" opacity="0.5">
          {steps(0, 330, 30).map((deg) => {
            const r = (deg * Math.PI) / 180;
            const x1 = Math.cos(r) * 38;
            const y1 = Math.sin(r) * 36;
            const x2 = Math.cos(r) * 50;
            const y2 = Math.sin(r) * 48;
            return <path key={deg} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
          })}
        </g>
      );
    case 'cleft':
      return (
        <path
          d="M0-48 q-8 50 0 100"
          fill="none"
          stroke={look.fillDark}
          strokeWidth="3.2"
          opacity="0.35"
        />
      );
    case 'diamonds':
      return (
        <g fill="none" stroke={a} strokeWidth="1.4" opacity="0.45">
          {steps(-52, 64, 20).flatMap((y, yi) =>
            steps(-60, 48, 32).map((x) => {
              const ox = x + (yi % 2 === 0 ? 0 : 16);
              return (
                <path
                  key={`${ox}-${y}`}
                  d={`M${ox} ${y} l16 10 16-10-16-10z`}
                />
              );
            })
          )}
        </g>
      );
    case 'bumps':
      return (
        <g fill={look.fillDark} opacity="0.3">
          {steps(-32, 36, 16).flatMap((y, yi) =>
            steps(-32, 32, 18).map((x) => (
              <circle
                key={`${x}-${y}`}
                cx={x + (yi % 2 === 0 ? 0 : 9)}
                cy={y}
                r="9"
              />
            ))
          )}
        </g>
      );
    case 'veins':
      return (
        <g fill="none" stroke={a} strokeWidth="1.6" opacity="0.35" strokeLinecap="round">
          <path d="M0-48 L0 50" />
          <path d="M0-20 Q-14 0 -18 18" />
          <path d="M0-20 Q14 0 18 18" />
          <path d="M0 8 Q-12 22 -14 36" />
          <path d="M0 8 Q12 22 14 36" />
        </g>
      );
    default:
      return null;
  }
}

/** Hats, leaves, stems — sit on the body, not clipped to it. */
function Accessories({ look }: { look: FruitLook & { id: FruitId } }) {
  const a = look.accent;
  return (
    <>
      {look.extras.map((extra) => {
        switch (extra) {
          case 'stem':
            if (look.shape === 'pepper') {
              return (
                <g key={extra} fill={a}>
                  <ellipse cx="0" cy="-32" rx="14" ry="6" />
                  <ellipse cx="0" cy="-34" rx="6" ry="11" />
                  <rect x="-2.5" y="-54" width="5" height="16" rx="2.5" />
                </g>
              );
            }
            if (look.shape === 'curve') {
              return (
                <g key={extra}>
                  <path
                    d="M16-50c2-10 14-12 18-4 2 5-4 10-12 9-5 0-8-2-6-5z"
                    fill={a}
                  />
                  <g
                    fill="none"
                    stroke={look.fillDark}
                    strokeWidth="1.5"
                    opacity="0.4"
                    strokeLinecap="round"
                  >
                    <path d="M12-18 Q26 0 20 28" />
                    <path d="M6-6 Q18 12 14 32" />
                  </g>
                </g>
              );
            }
            if (look.shape === 'butternut') {
              return (
                <rect
                  key={extra}
                  x="-4"
                  y="-66"
                  width="8"
                  height="12"
                  rx="2"
                  fill={a}
                />
              );
            }
            return (
              <rect
                key={extra}
                x="-3"
                y="-54"
                width="6"
                height="16"
                rx="2"
                fill="#7a5a3a"
              />
            );
          case 'leaf':
            return (
              <ellipse
                key={extra}
                cx="14"
                cy="-54"
                rx="14"
                ry="7"
                fill={a}
                transform="rotate(28 14 -54)"
              />
            );
          case 'calyx':
            return (
              <g key={extra} transform="translate(0 -48) scale(0.55)" fill={a}>
                <path d="M0 0 l-7-14 7 4 7-12 2 12 10-6-8 12 8 8-12-3-3 12-4-11-10 6z" />
              </g>
            );
          case 'sprout':
            return (
              <g
                key={extra}
                fill={a}
                stroke={a}
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M0-28 q-10-18-20-16" fill="none" />
                <ellipse
                  cx="-22"
                  cy="-46"
                  rx="9"
                  ry="5"
                  transform="rotate(-30 -22 -46)"
                />
              </g>
            );
          case 'husk':
            return (
              <g key={extra} fill={a} opacity="0.92">
                <ellipse
                  cx="-26"
                  cy="4"
                  rx="12"
                  ry="42"
                  transform="rotate(-16 -26 4)"
                />
                <ellipse
                  cx="26"
                  cy="4"
                  rx="12"
                  ry="42"
                  transform="rotate(16 26 4)"
                />
              </g>
            );
          case 'greens':
            if (look.id === 'cauliflower') {
              return (
                <g key={extra} fill={a}>
                  <LeafBlade transform="translate(-28 24) rotate(-42)" fill={a} />
                  <LeafBlade transform="translate(28 24) rotate(42)" fill={a} />
                  <LeafBlade transform="translate(-12 30) rotate(-16)" fill={a} />
                  <LeafBlade transform="translate(12 30) rotate(16)" fill={a} />
                </g>
              );
            }
            return (
              <g key={extra} fill={a}>
                <ellipse
                  cx="-12"
                  cy="-56"
                  rx="8"
                  ry="18"
                  transform="rotate(-24 -12 -56)"
                />
                <ellipse cx="0" cy="-60" rx="7" ry="20" />
                <ellipse
                  cx="12"
                  cy="-56"
                  rx="8"
                  ry="18"
                  transform="rotate(24 12 -56)"
                />
              </g>
            );
          case 'stems':
            return (
              <g key={extra}>
                <g
                  fill="none"
                  stroke={a}
                  strokeWidth="6"
                  strokeLinecap="round"
                >
                  <path d="M0 36 L-26 -20" />
                  <path d="M0 36 L-4 -28" />
                  <path d="M0 36 L24 -18" />
                </g>
                <g fill={look.fill} stroke={look.fillDark} strokeWidth="1.2">
                  <ellipse
                    cx="-26"
                    cy="-14"
                    rx="16"
                    ry="20"
                    transform="rotate(-32 -26 -14)"
                  />
                  <ellipse cx="0" cy="-18" rx="18" ry="22" />
                  <ellipse
                    cx="26"
                    cy="-12"
                    rx="16"
                    ry="20"
                    transform="rotate(30 26 -12)"
                  />
                </g>
              </g>
            );
          case 'crown':
            return (
              <g key={extra} fill={a}>
                <ellipse cx="0" cy="-30" rx="26" ry="12" />
                <path d="M-16-32l-8-30 20 22z" />
                <path d="M-4-34l2-34 14 24z" />
                <path d="M10-32l12-30 10 22z" />
                <path d="M-26-26l-12-22 20 14z" />
                <path d="M22-26l16-20 2 18z" />
              </g>
            );
          case 'fronds':
            return (
              <g key={extra}>
                <ellipse
                  cx="0"
                  cy="30"
                  rx="16"
                  ry="7"
                  fill={look.fillLight}
                />
                <g fill={look.fillDark} opacity="0.55">
                  <ellipse cx="-10" cy="-52" rx="8" ry="14" transform="rotate(-18 -10 -52)" />
                  <ellipse cx="2" cy="-56" rx="9" ry="16" />
                  <ellipse cx="12" cy="-50" rx="8" ry="14" transform="rotate(16 12 -50)" />
                </g>
              </g>
            );
          case 'cap':
            return (
              <path
                key={extra}
                d="M-22-44c8-14 36-14 44 0 4 8-6 16-22 16s-26-8-22-16z"
                fill={a}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
