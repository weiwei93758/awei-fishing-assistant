// utils/zone-info.js — 按地区维护「外海 / 内湾 / 养殖圈」信息
// 三类固定条目，名称、说明、提示均可由用户按地区修改，保存在本机。
// 不联网、不上传。默认内容为通用描述，非当地实测。

var ZONE_KEY = 'fishing_zones_v1';

var ZONE_DEFAULTS = [
  {
    id: 'offshore',
    name: '外海',
    desc: '远离岸线的开阔水域，水深与浪流变化较大。',
    tips: '出钓前先看 Windy 等实时风浪；风力 5 级以上或浪高明显抬升时停止岸钓与出海。'
  },
  {
    id: 'innerbay',
    name: '内湾',
    desc: '岸线凹入、相对避风的内侧水域，水流较缓。',
    tips: '观察涨落潮与进水口，注意退潮后水位变化与滩涂陷脚。'
  },
  {
    id: 'aquaculture',
    name: '养殖圈',
    desc: '筏式、网箱或围垦养殖区域。',
    tips: '属管控区域，不要进入或作钓；遵守现场告示，避免线组缠绕养殖设施。'
  }
];

// 广航的补充说明来自已有公开资料与钓记，不是精确测绘
var REGION_OVERRIDES = {
  guanghang: {
    offshore: {
      desc: '防波堤与岸线外侧的开阔水域，堤头外侧水深变化明显。',
      tips: '无护栏外海堤坝风浪大，秋季远离堤头；远投串钩或路亚搜索，先看实时风浪。'
    },
    innerbay: {
      desc: '珍珠湾一带岸线凹入的内侧水域，水流相对平缓。',
      tips: '涨潮时段饵料鱼靠岸机会较多；退潮后注意滩涂裸露与陷脚。'
    },
    aquaculture: {
      desc: '卫星图上右下岸上成片规则方格，疑似养殖池或盐田。',
      tips: '属管控区域，不要进入；现场若有围挡或告示，以现场要求为准。'
    }
  }
};

function readMap() {
  try {
    if (typeof wx === 'undefined') return {};
    var v = wx.getStorageSync(ZONE_KEY);
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  } catch (e) { return {}; }
}

function writeMap(map) {
  try {
    if (typeof wx === 'undefined') return false;
    wx.setStorageSync(ZONE_KEY, map);
    return true;
  } catch (e) { return false; }
}

function defaultZone(regionId, def) {
  var over = (REGION_OVERRIDES[regionId] || {})[def.id] || {};
  return {
    id: def.id,
    name: over.name || def.name,
    desc: over.desc || def.desc,
    tips: over.tips || def.tips,
    edited: false,
    updatedAt: 0
  };
}

// 始终返回三条，未自定义过的用默认内容
function getZones(regionId) {
  var saved = readMap()[regionId] || {};
  return ZONE_DEFAULTS.map(function(def) {
    var base = defaultZone(regionId, def);
    var s = saved[def.id];
    if (!s) return base;
    return {
      id: def.id,
      name: s.name !== undefined ? s.name : base.name,
      desc: s.desc !== undefined ? s.desc : base.desc,
      tips: s.tips !== undefined ? s.tips : base.tips,
      edited: true,
      updatedAt: s.updatedAt || 0
    };
  });
}

function saveZones(regionId, zones) {
  if (!regionId || !Array.isArray(zones)) return false;
  var map = readMap();
  var entry = {};
  zones.forEach(function(z) {
    if (!z || !z.id) return;
    entry[z.id] = {
      name: String(z.name === undefined ? '' : z.name).trim(),
      desc: String(z.desc === undefined ? '' : z.desc).trim(),
      tips: String(z.tips === undefined ? '' : z.tips).trim(),
      updatedAt: Date.now()
    };
  });
  map[regionId] = entry;
  return writeMap(map);
}

function resetZones(regionId) {
  var map = readMap();
  delete map[regionId];
  return writeMap(map);
}

function hasCustom(regionId) {
  var saved = readMap()[regionId];
  return !!(saved && Object.keys(saved).length > 0);
}

module.exports = {
  ZONE_KEY: ZONE_KEY,
  ZONE_IDS: ZONE_DEFAULTS.map(function(z) { return z.id; }),
  getZones: getZones,
  saveZones: saveZones,
  resetZones: resetZones,
  hasCustom: hasCustom
};
