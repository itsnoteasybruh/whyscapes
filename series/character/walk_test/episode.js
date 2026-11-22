// Mpi walk-cycle test (kit v1.2 asset): side view, planted feet, contact shadow, perspective-consistent size.
// node series/engine/render.js series/character/walk_test video mpi_walk_test.mp4
const K = require('../../engine/core'), T = require('../mpi_turn');
const END = 4, SC = 1.25, stride = 64, x0 = 120, x1 = 960;
function scene(t) {
  const u = Math.min(1, t / END), x = x0 + (x1 - x0) * u, dist = (x - x0) / SC, p = T.walkPose(dist, stride);
  let marks = ''; for (let i = 0; i < 20; i++) marks += `<path d="M${i * 60},1452 L${i * 60 + 30},1452" stroke="#CDBB9C" stroke-width="3"/>`;
  return `<svg width="1080" height="1920">${K.DEFS()}<rect width="1080" height="1920" fill="#F3EEE4"/>${K.grid('ripple', [540, 900])}
    <rect y="1000" width="1080" height="920" fill="#E3CFAD"/><path d="M0,1000 L1080,1000" stroke="#B9A88F" stroke-width="4"/>${marks.replace(/1452/g, '1092')}${marks.replace(/1452/g, '1782')}
    <g transform="${K.place(x, 1098, SC)}">${T.walkShadow(p)}${T.mpiSide({ dir: 'R', ...p })}</g>
    <g transform="${K.place(1080 - x, 1788, SC)}">${T.walkShadow(p)}${T.mpiSide({ dir: 'L', ...p })}</g>
    <text x="540" y="160" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="54" fill="#1F4D4A">UJI JALAN MPI</text>
    <text x="540" y="214" text-anchor="middle" font-family="Nunito" font-weight="800" font-size="30" fill="#8A7D6B">tampak samping kanan &amp; kiri · kaki tumpu menapak · bayangan ikut kontak</text></svg>`;
}
module.exports = { END, audio: 'silent.wav', tl: { subtitle: () => '' }, scene, firstScene: scene, transition: null, breathing: false, brand: { blurAmount: () => 0, loopMix: () => 0, overlay: () => '' } };
