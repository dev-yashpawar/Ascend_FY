const photographs = {
  entrance: {
    file: 'campus-entrance',
    width: 1672,
    height: 941,
    alt: 'Karmaveer Adv. Baburao Ganpatrao Thakare College of Engineering campus entrance in Nashik',
  },
  atrium: {
    file: 'campus-atrium',
    width: 1672,
    height: 941,
    alt: 'Colorful circular atrium architecture at KBTCOE campus',
  },
  building: {
    file: 'engineering-building',
    width: 1448,
    height: 1086,
    alt: 'KBTCOE engineering college academic building surrounded by campus greenery',
  },
} as const;
export function CampusImage({
  photo,
  wide = false,
}: {
  photo: keyof typeof photographs;
  wide?: boolean;
}) {
  const p = photographs[photo];
  const base = `/images/campus/${p.file}`;
  return (
    <img
      className={`campus-image campus-image-${photo}`}
      src={`${base}.webp`}
      srcSet={`${base}-768.webp 768w, ${base}-1280.webp 1280w, ${base}.webp ${p.width}w`}
      sizes={
        wide
          ? '(max-width: 767px) calc(100vw - 40px), (max-width: 1024px) calc(100vw - 64px), (max-width: 1336px) calc(100vw - 96px), 1240px'
          : '(max-width: 767px) calc(100vw - 40px), (max-width: 1336px) 55vw, 700px'
      }
      width={p.width}
      height={p.height}
      alt={p.alt}
      loading="lazy"
      decoding="async"
    />
  );
}
