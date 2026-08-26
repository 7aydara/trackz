/**
 * La marque : 恒 (heng — constance, perseverance) en rouge cinabre sur
 * une pierre grise, comme un sceau. C'est le seul endroit de l'app qui
 * echappe a la couleur d'accent du module : le logo ne change pas selon
 * l'ecran ou le theme.
 */
export function Logo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: "linear-gradient(160deg, #3c3b43 0%, #2a2930 100%)",
        boxShadow: `0 ${Math.max(2, Math.round(size * 0.06))}px 0 #17161b`,
      }}
    >
      <span
        className="relative leading-none"
        style={{
          fontSize: Math.round(size * 0.6),
          color: "#d92b3a",
          // Pile de polices CJK : chaque plateforme a la sienne.
          fontFamily:
            '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif',
          textShadow: `0 ${Math.round(size * 0.01)}px ${Math.round(size * 0.02)}px rgba(0,0,0,0.35)`,
        }}
      >
        恒
      </span>
    </span>
  );
}
