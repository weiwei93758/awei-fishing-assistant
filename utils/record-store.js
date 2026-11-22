// utils/record-store.js — 本机钓记的共享读写、备份与地区迁移
// 只操作本机 Storage，不联网、不上传。所有页面共用这一份数据入口。

var KEY = 'fishing_records_v1';
var BACKUP_KEY = 'fishing_records_backup_v1';

function readAll() {
  try {
    if (typeof wx === 'undefined') return [];
    var raw = wx.getStorageSync(KEY);
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function writeAll(records) {
  try {
    if (typeof wx === 'undefined') return false;
    wx.setStorageSync(KEY, Array.isArray(records) ? records : []);
    return true;
  } catch (e) {
    return false;
  }
}

function findById(id) {
  var list = readAll();
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === id) return list[i];
  }
  return null;
}

// 新增或按 id 覆盖一条，返回是否写入成功
function upsert(record) {
  if (!record || !record.id) return false;
  var list = readAll();
  var hit = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === record.id) { hit = i; break; }
  }
  if (hit >= 0) list[hit] = record;
  else list.push(record);
  return writeAll(list);
}

function remove(id) {
  var list = readAll().filter(function(r) { return !r || r.id !== id; });
  return writeAll(list);
}

// 删除记录并清理它永久目录里的图片，避免孤儿文件占用空间
function removeWithImages(id) {
  var target = findById(id);
  var ok = remove(id);
  if (!ok || !target || !Array.isArray(target.images) || target.images.length === 0) return ok;
  try {
    if (typeof wx === 'undefined') return ok;
    var fs = wx.getFileSystemManager();
    var dir = wx.env.USER_DATA_PATH + '/fishing_images/';
    target.images.forEach(function(src) {
      if (typeof src !== 'string' || src.indexOf(dir) !== 0) return; // 只删本目录内的文件
      try { fs.unlinkSync(src); } catch (e) {}
    });
  } catch (e) {}
  return ok;
}

// 单条转移地区，同时更新地区名，返回是否成功
function moveOne(id, regionId, regionName) {
  var list = readAll();
  var hit = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === id) {
      list[i].region = regionId;
      list[i].regionName = regionName || list[i].regionName || '';
      list[i].movedAt = Date.now();
      hit = true;
      break;
    }
  }
  if (!hit) return false;
  return writeAll(list);
}

// 批量把某地区记录改挂到目标地区（删除自定义地区前使用）
// 返回迁移条数；写入失败返回 -1
function relabel(fromId, toId, toName) {
  var list = readAll();
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r) continue;
    var own = r.region || 'guanghang';
    if (own === fromId) {
      r.region = toId;
      r.regionName = toName || r.regionName || '';
      r.movedAt = Date.now();
      n++;
    }
  }
  return writeAll(list) ? n : -1;
}

// 备份全部记录；备份失败时调用方应取消后续破坏性操作
function backup() {
  var list = readAll();
  try {
    if (typeof wx === 'undefined') return false;
    wx.setStorageSync(BACKUP_KEY, {
      at: Date.now(),
      count: list.length,
      records: list
    });
    return true;
  } catch (e) {
    return false;
  }
}

function backupInfo() {
  try {
    if (typeof wx === 'undefined') return null;
    var b = wx.getStorageSync(BACKUP_KEY);
    if (!b || typeof b !== 'object' || !Array.isArray(b.records)) return null;
    return { at: b.at || 0, count: b.records.length };
  } catch (e) {
    return null;
  }
}

// 用最近一次备份覆盖当前记录
function restoreBackup() {
  try {
    if (typeof wx === 'undefined') return false;
    var b = wx.getStorageSync(BACKUP_KEY);
    if (!b || !Array.isArray(b.records)) return false;
    return writeAll(b.records);
  } catch (e) {
    return false;
  }
}

module.exports = {
  KEY: KEY,
  BACKUP_KEY: BACKUP_KEY,
  readAll: readAll,
  writeAll: writeAll,
  findById: findById,
  upsert: upsert,
  remove: remove,
  removeWithImages: removeWithImages,
  moveOne: moveOne,
  relabel: relabel,
  backup: backup,
  backupInfo: backupInfo,
  restoreBackup: restoreBackup
};
