/**
 * One palette per era. Everything that is *lighting and air* lives here, so the
 * whole mood can be cross-faded from a single weight vector in main.js.
 */
export const ERAS = [
  {
    id: 'palaeolithic',
    name: 'Palaeolithic',
    year: -9000,
    yearLabel: '9,000 BCE',
    blurb: '猎人把营地扎在河湾上方的台地：兽皮棚、火塘，远山脊上缓慢移动的猛犸。河上没有桥。',
    sky: { top: '#1b2836', horizon: '#c08a63', sun: '#ffb877' },
    fog: { color: '#776d60', density: 0.004 },
    hemi: { sky: '#9fb0bd', ground: '#332e24', intensity: 0.6 },
    sun: { color: '#ffcb96', intensity: 2.5, dir: [0.45, 0.6, 0.66] },
    exposure: 1.02,
  },
  {
    id: 'iron',
    name: 'Iron Age',
    year: -800,
    yearLabel: '800 BCE',
    blurb: '圆形石屋与木栅栏围着同一块台地，崖顶立起三石牌坊。渡口上架起第一座木桥。',
    sky: { top: '#33465c', horizon: '#c2a582', sun: '#ffd39a' },
    fog: { color: '#847a67', density: 0.0036 },
    hemi: { sky: '#a9b8c4', ground: '#37321f', intensity: 0.62 },
    sun: { color: '#ffdcaa', intensity: 2.45, dir: [0.5, 0.63, 0.6] },
    exposure: 1.0,
  },
  {
    id: 'medieval',
    name: 'Medieval',
    year: 1348,
    yearLabel: '1348 CE',
    blurb: '石堡守着崖口，木构民居挤在教堂塔楼四周。风车在脊上转，木桥原位重建为石拱。',
    sky: { top: '#4b5b68', horizon: '#c9b28c', sun: '#ffe0b0' },
    fog: { color: '#918769', density: 0.0033 },
    hemi: { sky: '#b3bcc0', ground: '#3a3324', intensity: 0.72 },
    sun: { color: '#ffe9c2', intensity: 2.1, dir: [0.55, 0.68, 0.48] },
    exposure: 1.02,
  },
  {
    id: 'industrial',
    name: 'Industrial',
    year: 1881,
    yearLabel: '1881 CE',
    blurb: '砖砌工厂与七拱铁路高架跨过谷地，蒸汽列车不停站。山林被砍到只剩远坡。',
    sky: { top: '#333432', horizon: '#8a7860', sun: '#d8b48a' },
    fog: { color: '#655d51', density: 0.0048 },
    hemi: { sky: '#9aa0a3', ground: '#2b2620', intensity: 0.64 },
    sun: { color: '#e6bf94', intensity: 1.5, dir: [0.6, 0.66, 0.45] },
    exposure: 0.95,
  },
  {
    id: 'modern',
    name: 'Modern',
    year: 2026,
    yearLabel: '2026 CE',
    blurb: '玻璃塔楼接过天际线，风机在山脊上转。树木重新种回两岸，漂砾旁亮起一块铭牌。',
    sky: { top: '#152231', horizon: '#c07a4e', sun: '#ff9d5c' },
    fog: { color: '#584f46', density: 0.0031 },
    hemi: { sky: '#7f9cb4', ground: '#262420', intensity: 0.56 },
    sun: { color: '#ffb27a', intensity: 1.7, dir: [0.55, 0.42, 0.72] },
    exposure: 1.1,
  },
];

/** Real duration of each era in years, used by the stratigraphic rail. */
export const ERA_YEARS = [8200, 2148, 533, 145, 40];

/** River colour per era: the water is the same water, the light is not. */
export const WATER = [
  { deep: '#1e2c33', shallow: '#3d5355', sky: '#8a6a52', sun: '#e0a06a' },
  { deep: '#22343a', shallow: '#46605c', sky: '#8f7a5f', sun: '#e8b478' },
  { deep: '#26332f', shallow: '#4d6150', sky: '#96836a', sun: '#e6c089' },
  { deep: '#22262a', shallow: '#3b453f', sky: '#6f6354', sun: '#b99a72' },
  { deep: '#141f28', shallow: '#2f4a58', sky: '#9c5f3c', sun: '#e08a52' },
];

