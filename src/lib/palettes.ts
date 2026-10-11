export interface StudioPalette { id: string; name: string; description: string; colors: string[] }

/** Neighbouring swatches form highlight / midtone / shadow families. All colors are opaque sRGB. */
export const PALETTES: StudioPalette[] = [
  { id: 'skin', name: 'Skin & warmth', description: 'Highlights, midtones and shadows for a range of skin tones.', colors: ['#FFF0DE', '#F6D7BF', '#DCA48E', '#F2C79D', '#CB946B', '#9D6448', '#D99871', '#B77650', '#85513D', '#AB7962', '#79513F', '#50372F', '#F9B4B0', '#D77E8C', '#8E566E'] },
  { id: 'hair-natural', name: 'Natural hair', description: 'Soft blondes, warm auburns, browns and blue-black hair.', colors: ['#FFF1C7', '#E6C37C', '#B88843', '#E5AB81', '#AE6C47', '#683F31', '#CC8580', '#8B514C', '#4A3036', '#92909C', '#57576D', '#27263B', '#63707F', '#384553', '#171D2B'] },
  { id: 'hair-dream', name: 'Dreamy hair', description: 'Pastel pink, lavender and mint shade families.', colors: ['#FFF1F6', '#F7C0D4', '#CC789F', '#F2E8FF', '#C6ADE9', '#8973BC', '#E5FBF7', '#A5DCCF', '#5DADAD', '#EAF2FF', '#A6C7ED', '#6C96CF', '#FFDDBC', '#FFAE93', '#D97377'] },
  { id: 'hair-vivid', name: 'Vivid hair', description: 'Saturated red, cobalt, violet, turquoise and golden locks.', colors: ['#FFCFD0', '#F55477', '#A52D55', '#9CCEFF', '#477BEA', '#2B3F94', '#DAB4FF', '#9752DB', '#532D91', '#B1FFF0', '#28C9BA', '#147B85', '#FFF1A6', '#EAB948', '#B97A31'] },
  { id: 'eyes', name: 'Luminous eyes', description: 'Iris highlights, rich jewels and deep pupil accents.', colors: ['#FFFFFF', '#D1F9FF', '#6CD8EC', '#287BA5', '#273E64', '#DDFFD9', '#79C98E', '#346D65', '#FFF0B2', '#E9B358', '#95602F', '#FFD8ED', '#D38BCB', '#92599F', '#29273F'] },
  { id: 'kawaii', name: 'Kawaii pastels', description: 'Candy-soft colors for cute characters and cozy scenes.', colors: ['#FFF5E7', '#FFD5E3', '#EDA5C1', '#FFE8B8', '#F6CE77', '#C7EDDB', '#87C6B5', '#D4E8FA', '#A3C7E7', '#DDD2F5', '#B2A0DE', '#F0D7CA', '#C2978B', '#FFFFFF', '#645974'] },
  { id: 'festival', name: 'Lantern festival', description: 'Warm paper lanterns, indigo nights, silk and firework accents.', colors: ['#FFF0B8', '#FFC266', '#E97E57', '#B8425C', '#732E59', '#FBD8D4', '#D987A3', '#A64F80', '#B9C7F0', '#737AB5', '#3D406C', '#E4D89A', '#A8AD76', '#548481', '#202A49'] },
  { id: 'sunset', name: 'Peach sunset', description: 'Golden-hour light and gentle violet shadows.', colors: ['#FFF5CC', '#FFDB8E', '#FFB777', '#F88888', '#CD7293', '#9A6D9D', '#665C89', '#43466F', '#EACFE1', '#C5B3D9', '#98B0D1', '#6B93B3', '#C6D8B1', '#8DA997', '#536E70'] },
  { id: 'neon', name: 'Neon dreams', description: 'Electric highlights on deep midnight colors.', colors: ['#EFFFFF', '#83F5EF', '#25D2D8', '#199AB7', '#EADEFF', '#B389FF', '#7752D7', '#FFC9EC', '#FB70C2', '#CD3E98', '#F8FAA3', '#D8E758', '#273B60', '#22243F', '#10182C'] },
  { id: 'comic', name: 'Comic club', description: 'Expressive primaries, bold shadows and halftone-friendly mids.', colors: ['#FFF7D6', '#FFE266', '#F5B831', '#FFC7BA', '#EF6255', '#B93545', '#BEE0FB', '#4F9DE1', '#245993', '#CAE3B1', '#75AD6A', '#3F7457', '#C0A5DC', '#765998', '#2D2C43'] },
  { id: 'manga', name: 'Manga ink', description: 'Paper whites, neutral grays and deep ink for dramatic values.', colors: ['#FFFFFF', '#F4F4F4', '#E4E4E4', '#D0D0D0', '#BABABA', '#A1A1A1', '#858585', '#6D6D6D', '#575757', '#414141', '#303030', '#202020', '#141414', '#0B0B0B', '#000000'] },
  { id: 'garden', name: 'Secret garden', description: 'Leaf greens, petal pinks and soft floral accents.', colors: ['#F5F4D8', '#DDE7AF', '#A7C790', '#6F9C78', '#477263', '#FFDCE7', '#EEACCF', '#CE80B5', '#E6DFFF', '#BEB1EB', '#8F86BF', '#F7D4AA', '#DCAB80', '#A57861', '#4F5159'] },
];

export const palettes = PALETTES;

export function normalizeHex(value: string): string | undefined {
  const clean = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(clean)) return `#${[...clean].map(digit => digit + digit).join('').toUpperCase()}`;
  if (/^[\da-f]{6}$/i.test(clean)) return `#${clean.toUpperCase()}`;
  return undefined;
}
