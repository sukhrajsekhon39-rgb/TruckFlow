// Page background: calm topographic contour lines across the whole screen.
// The artwork lives in src/assets/topo-dark.svg and topo-light.svg (smooth
// vector curves); index.css shows the one that matches the current theme.
//
// Four of the lines softly glow in and out. Each glowing line is its own
// STATIC image (topo-glow-<theme>-<n>.svg, blur baked in) that CSS fades with
// an opacity animation. Opacity fades run on the GPU, so the images are drawn
// once instead of being redrawn every frame — this keeps the app fast.
//
// forceDark: always show the gold (dark-mode) artwork, whatever the app theme.
const LINES = [1, 2, 3, 4];

export default function TopographicBackground({ forceDark = false }) {
  return (
    <div className={`topo-bg${forceDark ? ' topo-force-dark' : ''}`} aria-hidden="true">
      <div className="topo-lines topo-dark" />
      <div className="topo-lines topo-light" />
      <div className="topo-glow topo-glow-dark">
        {LINES.map(n => <div key={n} className={`topo-glow-line g${n}`} />)}
      </div>
      <div className="topo-glow topo-glow-light">
        {LINES.map(n => <div key={n} className={`topo-glow-line g${n}`} />)}
      </div>
    </div>
  );
}
