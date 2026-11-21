// utils/regions.js — 地区注册表与按地区取数的集中入口
//
// 设计目标：
// 1. 默认地区仍是「广航」，原有资料与流程完全保留；
// 2. 其他地区使用「通用模板」，明确标注非本地实测，不编造钓点/鱼情；
// 3. 扩展方式：在 REGION_META 里加一项即可；若要做专属资料，给该地区补一个
//    bundle（结构见下方 makeGuanghangBundle），未提供的字段自动回退到通用模板。
//
// 本文件只在小程序内使用；读取 storage 时对 wx 做了兼容保护。

var data = require('./data.js');
var fishingLog = require('./fishing-log.js');
var formModule = require('./form-options.js');

var REGION_KEY = 'fishing_region_v1';
var DEFAULT_ID = 'guanghang';

// ---------- 地区元数据（扩展入口） ----------
// id：稳定标识，写入本机记录；name：下拉显示名；short：简称；tideLocation：潮汐 App 定位提示
var REGION_META = [
  { id: 'guanghang',   name: '广航 · 鲅鱼圈望海寨', short: '广航',   tideLocation: '鲅鱼圈／望海寨' },
  { id: 'yingkou',     name: '营口 · 辽东湾其他岸段', short: '营口',   tideLocation: '营口' },
  { id: 'dalian',      name: '大连 · 黄海/渤海沿岸', short: '大连',   tideLocation: '大连' },
  { id: 'dandong',     name: '丹东 · 鸭绿江口',       short: '丹东',   tideLocation: '丹东' },
  { id: 'qinhuangdao', name: '秦皇岛 · 渤海西岸',     short: '秦皇岛', tideLocation: '秦皇岛' },
  { id: 'tianjin',     name: '天津 · 渤海湾',         short: '天津',   tideLocation: '天津' },
  { id: 'yantai',      name: '烟台 · 山东半岛北岸',   short: '烟台',   tideLocation: '烟台' },
  { id: 'weihai',      name: '威海 · 山东半岛东端',   short: '威海',   tideLocation: '威海' },
  { id: 'qingdao',     name: '青岛 · 山东半岛南岸',   short: '青岛',   tideLocation: '青岛' },
  { id: 'lianyungang', name: '连云港 · 黄海西岸',     short: '连云港', tideLocation: '连云港' },
  { id: 'zhoushan',    name: '舟山 · 东海岛礁',       short: '舟山',   tideLocation: '舟山' },
  { id: 'xiamen',      name: '厦门 · 台湾海峡',       short: '厦门',   tideLocation: '厦门' },
  { id: 'shantou',     name: '汕头 · 南海东北岸',     short: '汕头',   tideLocation: '汕头' },
  { id: 'zhanjiang',   name: '湛江 · 北部湾东岸',     short: '湛江',   tideLocation: '湛江' },
  { id: 'sanya',       name: '三亚 · 南海热带岸段',   short: '三亚',   tideLocation: '三亚' },
  { id: 'other',       name: '其他地区（通用模板）',   short: '其他',   tideLocation: '请按实际钓点定位' }
];

// 地区专属资料覆盖表：键为地区 id，值为要覆盖 bundle 的字段（其余字段沿用通用模板）
// 例：beihai: { spots: [...], logs: [...], dataNote: '' }
// 注意：新增地区时只需在 REGION_META 加一项；只有要配专属资料时才在这里加覆盖。
var BUNDLE_OVERRIDES = {};

// ---------- 通用模板（不含编造的本地数据） ----------
function genericSafety() {
  return [
    '风力门槛：海上风力 5 级及以上不要出海；岸边风浪过大时取消礁石与堤坝作钓。',
    '防滑装备：礁石常年湿滑，矶钓必须穿防滑钉鞋，建议戴手套、配救生衣。',
    '涨潮撤离：赶海与滩涂作业在涨潮前 1 小时撤离；不要背对海浪在堤头停留。',
    '管控区域：遵守当地禁钓区、禁渔期与现场告示，不闯入养殖围挡。',
    '结伴与通讯：夜间作钓带头灯、手机保持电量，尽量结伴；把行程告知家人。'
  ];
}

function genericSpots(meta) {
  var s = meta.short;
  return [
    {
      id: meta.id + '-rock',
      name: s + ' · 礁石／岩岸（待补充）',
      badge: '通用类型',
      place: '该地区专属钓点档案尚未录入，此处仅按地形类型占位。具体位置请以当地地图与现场告示为准。',
      landform: '岩岸与礁石区通常水深变化较快、附着生物多，是常见的近岸钓点类型。',
      fish: '目标鱼种随海区差异很大，请以当地钓友实测或渔获记录为准。',
      method: '常见做法为礁石前打、串钩沉底或浮游矶钓；具体以当地允许钓法为准。',
      warning: '礁石湿滑，务必穿防滑钉鞋；避开游客、养殖设施与禁钓区。'
    },
    {
      id: meta.id + '-pier',
      name: s + ' · 防波堤／码头（待补充）',
      badge: '通用类型',
      place: '待补充具体位置。堤坝类钓点请先确认是否允许进入。',
      landform: '人工岸与防波堤外侧水深变化明显，常形成近岸鱼道。',
      fish: '近岸洄游鱼类与底层鱼类为主，因海区而异。',
      method: '岸投远投串钩沉底、浮钓或路亚，按当地鱼种选择。',
      warning: '无护栏堤坝风浪大，禁止攀爬堤头；管理要求以现场告示为准。'
    },
    {
      id: meta.id + '-beach',
      name: s + ' · 滩涂／沙滩（待补充）',
      badge: '通用类型',
      place: '待补充具体位置。滩涂作业注意潮汐时间。',
      landform: '沙坝、泥沙底与潮沟发育，常为咸淡水交汇区域。',
      fish: '梭鱼、鲻鱼及贝类资源较常见，因地区而异。',
      method: '浮钓、串钩底钓或赶海；大潮涨落时段窗口较好。',
      warning: '滩涂行走留意陷脚与涨潮，涨潮前 1 小时撤离。'
    }
  ];
}

function genericFishes() {
  var months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return [
    { id: 'g-bass', name: '鲈鱼类', level: '待补充', period: '本地窗口期尚未录入', months: months.slice(), method: '按当地钓法', bait: '按当地鱼种' },
    { id: 'g-spanish', name: '鲅鱼／马鲛类', level: '待补充', period: '本地窗口期尚未录入', months: months.slice(), method: '按当地钓法', bait: '按当地鱼种' },
    { id: 'g-mullet', name: '梭鱼／鲻鱼类', level: '待补充', period: '本地窗口期尚未录入', months: months.slice(), method: '按当地钓法', bait: '按当地鱼种' },
    { id: 'g-rock', name: '近岸岩礁鱼类', level: '待补充', period: '本地窗口期尚未录入', months: months.slice(), method: '按当地钓法', bait: '按当地鱼种' }
  ];
}

function makeGenericBundle(meta) {
  var base = formModule.formOptions;
  return {
    spots: genericSpots(meta),
    fishes: genericFishes(),
    gear: data.gear.slice(),
    safety: genericSafety(),
    sources: [],
    seaGuide: data.seaGuide,
    tideAdvice: data.tideAdvice,
    logs: [],
    insights: [{
      kind: 'core',
      title: '该地区暂无本人钓记',
      body: '切到该地区后，可以用「记一笔」开始积累本地记录。攒够几次后，再按季节、潮汐与钓法总结规律；在此之前不要把其他海区的经验直接套用。'
    }],
    boundaries: [
      '当前地区展示的是通用模板，钓点、鱼种窗口期均为占位说明，不是本地实测资料。',
      '本机「记一笔」记录按地区分开保存与查询；切换地区只改变当前查看范围，不会删除已有数据。'
    ],
    formOptions: {
      spots: genericSpots(meta).map(function(x) { return x.name; }).concat(['其他（备注里写明）']),
      structure: base.structure.slice(),
      tideSize: base.tideSize.slice(),
      tidePhase: base.tidePhase.slice(),
      weather: base.weather.slice(),
      windLevel: base.windLevel.slice(),
      windDir: base.windDir.slice(),
      water: base.water.slice(),
      gear: base.gear.slice(),
      fish: base.fish.slice()
    },
    tips: [
      { label: '季节', value: '请按当地当季判断' },
      { label: '主推', value: '暂无本地鱼情记录' },
      { label: '建议', value: '先用 Windy 看风浪再决定出钓' }
    ],
    tipWarn: '当前地区暂无本人历史数据，以上为通用参考。风浪、水温会改变鱼口，出海前请看实时数据。',
    anniversarySpot: meta.short + '（通用）',
    logTitle: meta.short + '海钓知识库',
    logSub: '暂无本人专属钓记',
    logCardText: '该地区暂无亲身钓记，点此去「记一笔」开始积累 →',
    logNote: '当前地区没有历史钓记。下面显示的是通用说明；新增的本机记录会留在当前地区，切换回来仍可查看。',
    anniversaryNote: '当前地区暂无本人历史钓记；「往年今日」只统计当前地区本机「记一笔」的记录。',
    dataNote: '当前地区暂无专属资料，以下为通用模板（非本地实测）。可在 utils/regions.js 中为该地区补充钓点、鱼种与钓记。',
    showSatellite: false
  };
}

// ---------- 广航专属 bundle：直接复用原有数据，流程不变 ----------
function makeGuanghangBundle(meta) {
  var base = formModule.formOptions;
  return {
    spots: data.spots,
    fishes: data.fishes,
    gear: data.gear,
    safety: data.safety,
    sources: data.sources,
    seaGuide: data.seaGuide,
    tideAdvice: data.tideAdvice,
    logs: fishingLog.logs,
    insights: fishingLog.insights,
    boundaries: fishingLog.boundaries,
    formOptions: base,
    tips: [
      { label: '季节', value: '11 月下旬 · 深秋' },
      { label: '主推', value: '礁石黑鲪、岸钓海鲶鱼' },
      { label: '已过', value: '鲅鱼主汛（7—10 月）' }
    ],
    tipWarn: '此为按鱼种窗口期的季节推算，不是实时鱼情。风浪、水温会改变鱼口，出海前请看 Windy 等实时数据。',
    anniversarySpot: '广航一带',
    logTitle: '广航海钓知识库',
    logSub: '2026 年本人 5 次亲身记录',
    logCardText: '2026 年广航 5 次亲身记录与规律总结 → 点此查看',
    logNote: '按日期从早到晚。潮汐窗口为经验划分，非精确潮时；标“未记录”的表示当时没记住，未作补造。',
    anniversaryNote: '历史同日来自 5 次亲身钓记与本机「记一笔」记录；“爆箱”等无具体数量的只标注、不估算。数量统计为参考，不代表科学规律。',
    dataNote: '',
    showSatellite: true
  };
}

// ---------- 组装地区表 ----------
var REGIONS = REGION_META.map(function(meta) {
  var isDefault = meta.id === DEFAULT_ID;
  var own = isDefault
    ? makeGuanghangBundle(meta)
    : Object.assign(makeGenericBundle(meta), BUNDLE_OVERRIDES[meta.id] || {});
  return {
    id: meta.id,
    name: meta.name,
    short: meta.short,
    tideLocation: meta.tideLocation,
    heroSub: isDefault ? '鲅鱼圈 · 望海寨 · 广航一带' : (meta.name + ' · 通用参考'),
    showSatellite: own.showSatellite,
    dataNote: own.dataNote,
    bundle: own
  };
});

function find(id) {
  for (var i = 0; i < REGIONS.length; i++) {
    if (REGIONS[i].id === id) return REGIONS[i];
  }
  return null;
}

function getCurrent() {
  var id = DEFAULT_ID;
  try {
    if (typeof wx !== 'undefined') {
      var saved = wx.getStorageSync(REGION_KEY);
      if (saved && find(saved)) id = saved;
    }
  } catch (e) {}
  return find(id) || find(DEFAULT_ID);
}

function setCurrent(id) {
  if (!find(id)) return false;
  try {
    if (typeof wx !== 'undefined') wx.setStorageSync(REGION_KEY, id);
  } catch (e) {}
  return true;
}

function getNames() {
  return REGIONS.map(function(r) { return r.name; });
}

function getIndex(id) {
  for (var i = 0; i < REGIONS.length; i++) {
    if (REGIONS[i].id === id) return i;
  }
  return 0;
}

function getIdByIndex(idx) {
  var i = Number(idx);
  if (isNaN(i) || i < 0 || i >= REGIONS.length) return DEFAULT_ID;
  return REGIONS[i].id;
}

// 兼容旧数据：没有 region 字段的本机记录一律视为广航
function isRecordOfRegion(record, regionId) {
  if (!record) return false;
  var r = record.region || DEFAULT_ID;
  return r === regionId;
}

module.exports = {
  REGION_KEY: REGION_KEY,
  DEFAULT_ID: DEFAULT_ID,
  regions: REGIONS,
  find: find,
  getCurrent: getCurrent,
  setCurrent: setCurrent,
  getNames: getNames,
  getIndex: getIndex,
  getIdByIndex: getIdByIndex,
  isRecordOfRegion: isRecordOfRegion
};
