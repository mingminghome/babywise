import { useId, type CSSProperties } from 'react';
import {
  bornBabyLook,
  bornBabyMood,
  type BornBabyLook,
} from '../core/baby/mascot';
import { useMascotAction } from '../core/pregnancy/mascotActions';
import type { TFunction } from '../core/i18n';
import type { BabyProfile, CalendarEvent } from '../core/types';

const FACE = '#26211e';
const TONGUE = '#ff7a90';
const MOUTH_DARK = '#7c2536';

type Props = {
  baby: BabyProfile;
  events: CalendarEvent[];
  t: TFunction;
  sleeping?: boolean;
};

/**
 * Cute swaddled baby mascot matching reference design:
 * round tilted head, cozy swaddle wrap, top hair curl, wide innocent eyes,
 * gentle cradle rocking idle animation, and joyful swaddle giggle on click.
 */
export function BornBabyMascot({ baby, events, t, sleeping = false }: Props) {
  const look = bornBabyLook(baby, events);
  const mood = bornBabyMood(sleeping);
  const { currentAction, activeMood, isReacting, shapeModifier, trigger } =
    useMascotAction(mood, 'tiny', 'apple');
  const uid = useId().replace(/:/g, '');
  const skinGrad = `born-skin-${uid}`;
  const moodLabel = t(`home.fruit.mood.${activeMood}`);

  // Swaddle colors based on sex / accent
  const swaddleBase =
    look.sex === 'girl'
      ? '#f5a8b8'
      : look.sex === 'boy'
        ? '#7eb8da' // matching reference baby blue
        : '#8cd3b8';

  const swaddleLine =
    look.sex === 'girl'
      ? '#db7d92'
      : look.sex === 'boy'
        ? '#589ac2'
        : '#63b293';

  return (
    <figure
      className={`baby-fruit born-baby-mascot ${shapeModifier.shapeClass} ${isReacting ? 'is-reacting' : ''}`}
      data-mood={activeMood}
      data-action={currentAction}
      data-reacting={isReacting ? 'true' : undefined}
      data-shape="tiny"
      data-sex={look.sex}
      role="button"
      tabIndex={0}
      onClick={() => trigger()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger();
        }
      }}
      title={`${baby.name} · ${moodLabel}`}
      aria-label={`${baby.name} · ${moodLabel}`}
      style={
        {
          '--mascot-size': `${Math.max(look.displayPx, 136)}px`,
        } as CSSProperties
      }
    >
      <svg
        className="baby-fruit-svg mascot born-baby-mascot-svg"
        viewBox="0 0 200 210"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={skinGrad} cx="38%" cy="32%" r="66%">
            <stop offset="0%" stopColor={look.skinLight} />
            <stop offset="65%" stopColor={look.skin} />
            <stop offset="100%" stopColor={look.skinDark} />
          </radialGradient>
        </defs>

        {/* Entire swaddled baby character with cradle rock & click giggle animation */}
        <g className="baby-cradle-wrap">
          {/* Swaddle Body (cozy cocoon with diagonal wrap folds) */}
          <g className="baby-swaddle">
            <path
              d="M 76 96
                 C 62 114 56 142 68 174
                 C 78 198 104 206 122 196
                 C 144 184 156 148 149 116
                 C 145 98 132 91 118 90
                 C 102 88 88 90 76 96 Z"
              fill={swaddleBase}
            />
            <path
              d="M 64 122 Q 105 116 146 114"
              fill="none"
              stroke={swaddleLine}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M 145 124 L 72 178"
              fill="none"
              stroke={swaddleLine}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M 143 165 L 96 200"
              fill="none"
              stroke={swaddleLine}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </g>

          {/* Baby Head */}
          <g className="baby-head-wrap">
            {/* Left Ear */}
            <ellipse
              cx="55"
              cy="70"
              rx="5.5"
              ry="7.5"
              fill={`url(#${skinGrad})`}
              stroke={look.skinDark}
              strokeWidth="1.2"
            />
            <ellipse
              cx="56"
              cy="70"
              rx="3"
              ry="4.5"
              fill={look.skinDark}
              opacity="0.35"
            />

            {/* Right Ear */}
            <ellipse
              cx="145"
              cy="70"
              rx="5.5"
              ry="7.5"
              fill={`url(#${skinGrad})`}
              stroke={look.skinDark}
              strokeWidth="1.2"
            />
            <ellipse
              cx="144"
              cy="70"
              rx="3"
              ry="4.5"
              fill={look.skinDark}
              opacity="0.35"
            />

            {/* Round head matching reference */}
            <circle
              cx="100"
              cy="68"
              r="46"
              fill={`url(#${skinGrad})`}
              stroke={look.skinDark}
              strokeWidth="1.2"
            />

            {/* Signature Hair Curl from reference */}
            <Hair
              sex={look.sex}
              fill={look.hair}
              accent={look.accent}
              none={look.hairNone}
            />

            {/* Rosy cheeks matching reference */}
            <ellipse
              className="plush-blush"
              cx="78"
              cy="84"
              rx="6.5"
              ry="3.8"
              transform="rotate(-8 78 84)"
              fill={look.blush}
            />
            <ellipse
              className="plush-blush"
              cx="122"
              cy="84"
              rx="6.5"
              ry="3.8"
              transform="rotate(8 122 84)"
              fill={look.blush}
            />

            {/* Eyes & Mouth */}
            <Face mood={activeMood} isReacting={isReacting} />
          </g>
        </g>
      </svg>
    </figure>
  );
}

function Hair({
  sex,
  fill,
  accent,
  none,
}: {
  sex: BornBabyLook['sex'];
  fill: string;
  accent: string;
  none: boolean;
}) {
  if (none) {
    // Delicate tiny peach fuzz curl
    return (
      <path
        d="M 99 23 C 97 18, 103 14, 106 17 C 108 20, 105 23, 102 22"
        fill="none"
        stroke={fill}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    );
  }

  // Signature curl matching reference image with sway animation group
  const curl = (
    <g className="baby-hair-curl">
      <path
        d="M 98 23 C 94 15, 103 10, 107 14 C 110 18, 107 23, 103 22 C 99 21, 99 17, 103 16"
        fill="none"
        stroke={fill}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );

  if (sex !== 'girl') {
    return curl;
  }

  // For baby girl: curl + cute baby hair bow
  const bs = 8.5;
  return (
    <g>
      {curl}
      <g transform="translate(132 40) rotate(22)">
        <path
          d={`M 0 0 C ${-bs * 1.5} ${-bs * 1.1} ${-bs * 1.5} ${bs * 1.1} 0 0 Z`}
          fill={accent}
          stroke="#fff"
          strokeWidth="1"
        />
        <circle cx={-bs * 0.6} cy="0" r={bs * 0.25} fill="#fff" opacity="0.4" />
        <path
          d={`M 0 0 C ${bs * 1.5} ${-bs * 1.1} ${bs * 1.5} ${bs * 1.1} 0 0 Z`}
          fill={accent}
          stroke="#fff"
          strokeWidth="1"
        />
        <circle cx={bs * 0.6} cy="0" r={bs * 0.25} fill="#fff" opacity="0.4" />
        <circle cx="0" cy="0" r={bs * 0.45} fill={accent} stroke="#fff" strokeWidth="1" />
      </g>
    </g>
  );
}

function Face({
  mood,
  isReacting,
}: {
  mood: 'walk' | 'smile' | 'sleep';
  isReacting: boolean;
}) {
  const isSleep = mood === 'sleep' && !isReacting;

  if (isSleep) {
    return (
      <g className="mascot-face" aria-hidden="true">
        {/* Sleeping peaceful closed eyes */}
        <path
          d="M 77 72 Q 83 77 89 72"
          fill="none"
          stroke={FACE}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M 80 75 L 79 78"
          fill="none"
          stroke={FACE}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M 86 75 L 87 78"
          fill="none"
          stroke={FACE}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        <path
          d="M 111 72 Q 117 77 123 72"
          fill="none"
          stroke={FACE}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M 114 75 L 113 78"
          fill="none"
          stroke={FACE}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M 120 75 L 121 78"
          fill="none"
          stroke={FACE}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Sweet sleeping mouth */}
        <path
          d="M 97 83 Q 100 86 103 83"
          fill="none"
          stroke={FACE}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Floating Zzz */}
        <g className="plush-zzz" fill={FACE}>
          <text className="plush-z" x="126" y="52" fontSize="12">
            z
          </text>
          <text className="plush-z" x="136" y="38" fontSize="15">
            z
          </text>
        </g>
      </g>
    );
  }

  // Awake (Smile, Walk, or Giggling on Click)
  return (
    <g className="mascot-face" aria-hidden="true">
      {/* Left Eye with twinkle highlight */}
      <g transform="translate(83 72)">
        <g className="plush-eye">
          <circle cx="0" cy="0" r="5.6" fill={FACE} />
          <circle cx="1.6" cy="-1.8" r="2.0" fill="#fff" />
          <circle cx="-1.5" cy="1.6" r="0.8" fill="#fff" opacity="0.7" />
        </g>
      </g>

      {/* Right Eye with twinkle highlight */}
      <g transform="translate(117 72)">
        <g className="plush-eye" style={{ animationDelay: '0.07s' }}>
          <circle cx="0" cy="0" r="5.6" fill={FACE} />
          <circle cx="1.6" cy="-1.8" r="2.0" fill="#fff" />
          <circle cx="-1.5" cy="1.6" r="0.8" fill="#fff" opacity="0.7" />
        </g>
      </g>

      {/* Mouth */}
      {isReacting ? (
        /* Joyful open giggle mouth on click */
        <g className="plush-smile">
          <path
            d="M 95 81 Q 100 90 105 81 C 103 86 97 86 95 81 Z"
            fill={MOUTH_DARK}
            stroke={FACE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M 96.5 84.5 Q 100 82.5 103.5 84.5 Q 100 89 96.5 84.5 Z"
            fill={TONGUE}
          />
        </g>
      ) : (
        /* Sweet gentle baby smile matching reference */
        <path
          className="plush-smile"
          d="M 95 82 Q 100 86.5 105 82"
          fill="none"
          stroke={FACE}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}
