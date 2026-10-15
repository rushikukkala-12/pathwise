import { useState } from 'react';
import { CATEGORY_STYLE } from '../utils/constants';
import { cx } from './ui';

const hash = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** Hand-drawn style scenes per category. Used when a place has no photo (or the photo fails to load). */
function Scene({ category, seed }) {
  const sx = 240 + (seed % 100);
  const w = 'rgba(255,255,255,';
  switch (category) {
    case 'Beach':
      return (<g><circle cx={sx} cy="78" r="30" fill={`${w}.85)`} /><path d="M0 150 Q50 130 100 150 T200 150 T300 150 T400 150 V240 H0Z" fill={`${w}.28)`} /><path d="M0 178 Q50 160 100 178 T200 178 T300 178 T400 178 V240 H0Z" fill={`${w}.35)`} /><path d="M0 206 Q60 192 120 206 T240 206 T400 206 V240 H0Z" fill={`${w}.5)`} /></g>);
    case 'Nature':
      return (<g><circle cx={sx} cy="70" r="22" fill={`${w}.7)`} /><path d="M0 170 L70 100 L130 160 L200 90 L290 175 L340 130 L400 170 V240 H0Z" fill={`${w}.25)`} /><path d="M0 200 Q90 150 180 195 T400 190 V240 H0Z" fill={`${w}.4)`} />{[60, 110, 330].map((x) => <path key={x} d={`M${x} 205 l14 -38 l14 38z`} fill={`${w}.7)`} />)}</g>);
    case 'Historical':
      return (<g><circle cx={sx} cy="62" r="20" fill={`${w}.6)`} /><path d="M70 220 V120 h20 v-14 h14 v14 h20 v-14 h14 v14 h20 V220z M230 220 V100 h22 v-14 h12 v14 h22 v-14 h12 v14 h22 V220z" fill={`${w}.55)`} /><path d="M150 220 V150 a30 30 0 0 1 60 0 V220z" fill={`${w}.85)`} /></g>);
    case 'Adventure':
      return (<g><path d="M0 200 L90 80 L150 160 L220 60 L320 190 L400 130 V240 H0Z" fill={`${w}.3)`} /><path d="M220 60 L192 100 L215 94 L228 108 L240 92 L262 100z" fill={`${w}.85)`} /><path d="M310 120 v80 M322 130 v70 M334 125 v75" stroke={`${w}.7)`} strokeWidth="5" strokeLinecap="round" /></g>);
    case 'Food':
      return (<g><ellipse cx="200" cy="170" rx="120" ry="30" fill={`${w}.4)`} /><path d="M100 140 a100 70 0 0 0 200 0z" fill={`${w}.85)`} />{[160, 200, 240].map((x) => <path key={x} d={`M${x} 110 q-10 -18 0 -34 q10 -16 0 -30`} stroke={`${w}.7)`} strokeWidth="5" fill="none" strokeLinecap="round" />)}</g>);
    case 'Shopping':
      return (<g><path d="M50 90 h300 l-20 40 H70z" fill={`${w}.6)`} />{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${50 + i * 50} 90 l-4 40 h-46z`} fill={i % 2 ? `${w}.25)` : `${w}.85)`} />)}<rect x="80" y="130" width="240" height="90" fill={`${w}.3)`} /><rect x="170" y="160" width="60" height="60" fill={`${w}.7)`} /></g>);
    case 'Culture':
      return (<g><circle cx={sx} cy="60" r="18" fill={`${w}.6)`} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M${200 - (80 - i * 18)} ${215 - i * 32} h${(80 - i * 18) * 2} l-8 -30 h-${(80 - i * 18) * 2 - 16}z`} fill={`${w}${0.85 - i * 0.12})`} />)}<rect x="60" y="215" width="280" height="10" fill={`${w}.5)`} /></g>);
    default: // Entertainment
      return (<g><circle cx="200" cy="130" r="72" fill="none" stroke={`${w}.7)`} strokeWidth="6" />{[0, 45, 90, 135].map((a) => <line key={a} x1="200" y1="130" x2={200 + 72 * Math.cos((a * Math.PI) / 180)} y2={130 + 72 * Math.sin((a * Math.PI) / 180)} stroke={`${w}.5)`} strokeWidth="3" />)}<circle cx="200" cy="130" r="9" fill={`${w}.9)`} /><path d="M170 240 L200 130 L230 240" fill="none" stroke={`${w}.6)`} strokeWidth="5" />{[[60, 50], [320, 70], [350, 150], [40, 140]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill={`${w}.7)`} />)}</g>);
  }
}

export default function PlaceImage({ place, className, rounded = 'rounded-xl' }) {
  const [broken, setBroken] = useState(false);
  const c = CATEGORY_STYLE[place.category] || CATEGORY_STYLE.Nature;
  const id = `g${hash(place.name)}`;
  if (place.image && !broken) {
    return <img src={place.image} alt={place.name} loading="lazy" onError={() => setBroken(true)} className={cx('h-full w-full object-cover', rounded, className)} />;
  }
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${place.category} illustration for ${place.name}`} className={cx('h-full w-full', rounded, className)}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.from} /><stop offset="1" stopColor={c.to} /></linearGradient></defs>
      <rect width="400" height="240" fill={`url(#${id})`} />
      <Scene category={place.category} seed={hash(place.name)} />
    </svg>
  );
}
