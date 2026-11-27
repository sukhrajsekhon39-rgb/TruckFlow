// Page background: calm topographic contour lines across the whole screen.
// The artwork lives in src/assets/topo-dark.svg and topo-light.svg (smooth
// vector curves); index.css shows the one that matches the current theme.
// topo-glow-*.svg hold a few of the same lines with a soft halo that fades in
// and out (the animation lives inside the SVG).
// forceDark: always show the gold (dark-mode) artwork, whatever the app theme.
export default function TopographicBackground({ forceDark = false }) {
  return (
    <div className={`topo-bg${forceDark ? ' topo-force-dark' : ''}`} aria-hidden="true">
      <div className="topo-lines topo-dark" />
      <div className="topo-lines topo-light" />
      {/* A few lines with a soft, slowly breathing glow */}
      <div className="topo-lines topo-glow topo-glow-dark" />
      <div className="topo-lines topo-glow topo-glow-light" />
    </div>
  );
}
