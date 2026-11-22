// utils/data-backup.js — 本机数据导出与导入
// 把所有个人数据打包成一个 JSON 文件，或从文件恢复；不联网。

var VERSION = 1;

var KEYS = [
  { key: 'fishing_records_v1', label: '钓记' },
  { key: 'fishing_records_backup_v1', label: '钓记备份' },
  { key: 'fishing_region_v1', label: '当前地区' },
  { key: 'fishing_custom_regions_v1', label: '自定义地区' },
  { key: 'fishing_region_params_v1', label: '定位参数' },
  { key: 'fishing_zones_v1', label: '海域类型信息' },
  { key: 'fishing_gear_v1', label: '装备勾选' }
];

function readKey(key) {
  try {
    if (typeof wx === 'undefined') return undefined;
    var v = wx.getStorageSync(key);
    return (v === '' || v === undefined || v === null) ? undefined : v;
  } catch (e) {
    return undefined;
  }
}

function writeKey(key, value) {
  try {
    if (typeof wx === 'undefined') return false;
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

// 打包全部本机数据
function exportData() {
  var payload = { app: 'awei-fishing-assistant', version: VERSION, exportedAt: Date.now(), data: {} };
  var count = 0;
  KEYS.forEach(function(item) {
    var v = readKey(item.key);
    if (v !== undefined) {
      payload.data[item.key] = v;
      count++;
    }
  });
  return { payload: payload, count: count };
}

// 统计当前数据量，供页面展示
function summary() {
  var out = [];
  KEYS.forEach(function(item) {
    var v = readKey(item.key);
    var n = 0;
    if (Array.isArray(v)) n = v.length;
    else if (v && typeof v === 'object') n = Object.keys(v).length;
    else if (v !== undefined) n = 1;
    out.push({ key: item.key, label: item.label, count: n, present: v !== undefined });
  });
  return out;
}

// 记录按 id 去重；导入的补到末尾，同 id 以导入记录覆盖（视为较新版本）
function mergeRecords(existing, incoming) {
  var base = Array.isArray(existing) ? existing.slice() : [];
  var map = {};
  base.forEach(function(r, i) { if (r && r.id) map[r.id] = i; });
  var added = 0, updated = 0;
  (Array.isArray(incoming) ? incoming : []).forEach(function(r) {
    if (!r || typeof r !== 'object') return;
    if (!r.id) r.id = 'imp' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    if (map[r.id] !== undefined) {
      base[map[r.id]] = r;
      updated++;
    } else {
      map[r.id] = base.length;
      base.push(r);
      added++;
    }
  });
  return { list: base, added: added, updated: updated };
}

// 校验并导入。mode: 'merge'（默认，记录合并去重）或 'replace'（整体覆盖）
function importData(payload, mode) {
  if (!payload || typeof payload !== 'object') return { ok: false, msg: '文件内容不是有效数据' };
  if (payload.app !== 'awei-fishing-assistant') return { ok: false, msg: '不是本小程序的备份文件' };
  if (!payload.data || typeof payload.data !== 'object') return { ok: false, msg: '备份内容为空或损坏' };
  if (payload.version > VERSION) return { ok: false, msg: '备份版本较新，请升级小程序后再导入' };

  var replace = mode === 'replace';
  var added = 0, updated = 0, written = 0;

  if (replace) {
    // 覆盖模式：只写备份里存在的 key，未包含的保留
    Object.keys(payload.data).forEach(function(key) {
      if (writeKey(key, payload.data[key])) written++;
    });
    var rec = payload.data['fishing_records_v1'];
    added = Array.isArray(rec) ? rec.length : 0;
    return { ok: true, written: written, added: added, updated: 0, mode: 'replace' };
  }

  // 合并模式：普通 key 直接覆盖（自定义地区/参数/海域/装备按 id 合并）
  Object.keys(payload.data).forEach(function(key) {
    var incoming = payload.data[key];
    if (key === 'fishing_records_v1' || key === 'fishing_records_backup_v1') {
      var m = mergeRecords(readKey(key), incoming);
      if (writeKey(key, m.list)) {
        written++;
        if (key === 'fishing_records_v1') { added += m.added; updated += m.updated; }
      }
      return;
    }
    if (key.indexOf('fishing_') === 0) {
      var current = readKey(key);
      var merged = current;
      if (incoming && typeof incoming === 'object' && !Array.isArray(incoming) &&
          current && typeof current === 'object' && !Array.isArray(current)) {
        merged = Object.assign({}, current, incoming);
      } else {
        merged = incoming;
      }
      if (writeKey(key, merged)) written++;
    }
  });
  return { ok: true, written: written, added: added, updated: updated, mode: 'merge' };
}

module.exports = {
  VERSION: VERSION,
  KEYS: KEYS,
  exportData: exportData,
  summary: summary,
  importData: importData
};
