// utils/anniversary.js — “往年今日渔获”查询的纯计算逻辑
// 不依赖 wx / window，网页版与小程序共用。数据源由调用方传入。

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function daysInMonth(y, m) {
  var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return 29;
  return days[m - 1] || 0;
}

function getToday() {
  var d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function dateKey(m, d) {
  return pad2(m) + '-' + pad2(d);
}

// 解析用户输入：支持 2026-08-17 / 2026/8/17 / 08-17 / 8-17 / 8月17日 / 今天
// 返回 { ok, y, m, d, key, hasYear, error }
function parseInput(raw, today) {
  today = today || getToday();
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return fail('请输入日期');
  if (s === '今天' || s === '今日') {
    return ok(today.y, today.m, today.d, true);
  }
  var y = null, m = null, d = null, hasYear = false;
  var match;

  match = s.match(/^(\d{4})\s*[-\/.年]\s*(\d{1,2})\s*[-\/.月]\s*(\d{1,2})\s*日?$/);
  if (match) {
    y = parseInt(match[1], 10); m = parseInt(match[2], 10); d = parseInt(match[3], 10); hasYear = true;
  }
  if (y === null) {
    match = s.match(/^(\d{4})$/);
    if (match) return fail('只填年份无法定位到某一天，请补充月日');
  }
  if (y === null) {
    match = s.match(/^(\d{1,2})\s*[-\/.月]\s*(\d{1,2})\s*日?$/);
    if (match) { m = parseInt(match[1], 10); d = parseInt(match[2], 10); }
  }
  if (m === null || d === null) return fail('日期格式无效，示例：08-17 或 2026-08-17 或 8月17日');

  if (m < 1 || m > 12) return fail('月份应在 1—12 之间');
  var checkYear = hasYear ? y : today.y;
  if (d < 1 || d > daysInMonth(checkYear, m)) {
    return fail(checkYear + ' 年 ' + m + ' 月没有 ' + d + ' 日');
  }
  if (hasYear && (y < 2000 || y > today.y + 1)) return fail('年份超出可选范围（2000—' + (today.y + 1) + '）');

  // 未来日期：带年份的完整日期晚于今天，或仅月日但按今年换算晚于今天
  if (hasYear) {
    if (y > today.y || (y === today.y && (m > today.m || (m === today.m && d > today.d)))) {
      return { ok: false, future: true, error: '这是未来日期，暂无渔获记录', y: y, m: m, d: d, key: dateKey(m, d), hasYear: true };
    }
  } else if (m > today.m || (m === today.m && d > today.d)) {
    return { ok: false, future: true, error: '这是未来日期，暂无渔获记录', y: today.y, m: m, d: d, key: dateKey(m, d), hasYear: false };
  }

  return ok(y || today.y, m, d, hasYear);

  function ok(yy, mm, dd, hy) {
    return { ok: true, y: yy, m: mm, d: dd, key: dateKey(mm, dd), hasYear: hy, error: '' };
  }
  function fail(msg) {
    return { ok: false, error: msg };
  }
}

// 从记录里提取可计数的渔获数量；无法量化返回 null，不编造
function extractCount(rec) {
  if (!rec) return null;
  if (typeof rec.catchCount === 'number' && isFinite(rec.catchCount) && rec.catchCount >= 0) {
    return rec.catchCount;
  }
  var text = String(rec.catchText || '') + ' ' + String(rec.result || '') + ' ' + String(rec.fish || '');
  if (/空军|无渔获|没鱼|未上鱼/.test(text) && !/\d/.test(text)) return 0;
  var m = text.match(/(\d+)\s*(条|尾|斤|公斤|kg|千克)/i);
  if (m) return parseInt(m[1], 10);
  if (/爆箱|爆护|满舱/.test(text)) return null; // 有渔获但数量未知，绝不估算
  return null;
}

// 统一历史钓记与本机记录的结构
// spotLabel：历史钓记的地区标签，由调用方按当前地区传入；缺省仍为广航，保持向后兼容
function normalize(historyLogs, localRecords, spotLabel) {
  var out = [];
  var i, r, parts;
  historyLogs = historyLogs || [];
  localRecords = localRecords || [];
  for (i = 0; i < historyLogs.length; i++) {
    r = historyLogs[i];
    parts = String(r.date || '').split('-');
    if (parts.length !== 3) continue;
    out.push({
      id: r.id || ('h' + i),
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
      key: dateKey(parseInt(parts[1], 10), parseInt(parts[2], 10)),
      count: extractCount(r),
      text: r.catchText || r.result || '未记录',
      result: r.result || '',
      spot: spotLabel || '广航一带',
      source: '历史钓记',
      tide: r.tide || '',
      note: r.note || ''
    });
  }
  for (i = 0; i < localRecords.length; i++) {
    r = localRecords[i];
    parts = String(r.date || '').split('-');
    if (parts.length !== 3) continue;
    out.push({
      id: r.id || ('l' + i),
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
      key: dateKey(parseInt(parts[1], 10), parseInt(parts[2], 10)),
      count: extractCount(r),
      text: r.catchText || r.fish || '未记录',
      result: r.fish || '',
      spot: r.spot || '未记录',
      source: '本机记录',
      tide: r.tide || '',
      note: r.note || ''
    });
  }
  return out;
}

// 查询同月日的全部记录，并按年份汇总
function querySameDay(dataset, key, today) {
  today = today || getToday();
  var items = [];
  for (var i = 0; i < dataset.length; i++) {
    if (dataset[i].key === key) items.push(dataset[i]);
  }
  items.sort(function(a, b) {
    if (b.year !== a.year) return b.year - a.year;
    return String(a.id).localeCompare(String(b.id));
  });

  var byYear = [];
  var map = {};
  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    if (!map[it.year]) {
      map[it.year] = { year: it.year, total: 0, known: 0, unknown: 0, items: [], text: '' };
      byYear.push(map[it.year]);
    }
    var g = map[it.year];
    g.items.push(it);
    if (it.count === null) {
      g.unknown++;
    } else {
      g.known++;
      g.total += it.count;
    }
    g.text += (g.text ? '；' : '') + it.result + '（' + it.text + '）';
  }
  byYear.sort(function(a, b) { return b.year - a.year; });

  var totalKnown = 0, knownRecords = 0, unknownRecords = 0;
  for (var k = 0; k < items.length; k++) {
    if (items[k].count === null) unknownRecords++;
    else { knownRecords++; totalKnown += items[k].count; }
  }
  var avg = knownRecords > 0 ? Math.round(totalKnown / knownRecords * 10) / 10 : null;

  // 当前日期（今天）的渔获情况
  var todayKey = dateKey(today.m, today.d);
  var todayItems = [];
  for (var t = 0; t < dataset.length; t++) {
    if (dataset[t].key === todayKey && dataset[t].year === today.y) todayItems.push(dataset[t]);
  }
  var todayCount = 0, todayKnown = 0, todayUnknown = 0;
  for (var u = 0; u < todayItems.length; u++) {
    if (todayItems[u].count === null) todayUnknown++;
    else { todayKnown++; todayCount += todayItems[u].count; }
  }

  return {
    key: key,
    items: items,
    byYear: byYear,
    totalKnown: totalKnown,
    knownRecords: knownRecords,
    unknownRecords: unknownRecords,
    avg: avg,
    years: byYear.length,
    today: {
      key: todayKey,
      count: todayCount,
      known: todayKnown,
      unknown: todayUnknown,
      items: todayItems,
      hasData: todayItems.length > 0
    }
  };
}

function compareText(result, today) {
  var hist = result.avg;
  var cur = result.today.hasData && result.today.known > 0 ? result.today.count : null;
  if (hist === null && cur === null) return '历史同日与今日均无可量化渔获数据，暂无法对比。';
  if (hist === null) return '今日渔获 ' + cur + ' 条；历史同日有记录但数量未量化，无法计算平均值。';
  if (cur === null) return '历史同日平均 ' + hist + ' 条；今日' + (result.today.hasData ? '记录数量未量化' : '暂无记录') + '，无法对比。';
  var diff = Math.round((cur - hist) * 10) / 10;
  if (diff > 0) return '今日 ' + cur + ' 条，比历史同日平均（' + hist + ' 条）多 ' + diff + ' 条。';
  if (diff < 0) return '今日 ' + cur + ' 条，比历史同日平均（' + hist + ' 条）少 ' + Math.abs(diff) + ' 条。';
  return '今日 ' + cur + ' 条，与历史同日平均持平。';
}

module.exports = {
  getToday: getToday,
  dateKey: dateKey,
  parseInput: parseInput,
  extractCount: extractCount,
  normalize: normalize,
  querySameDay: querySameDay,
  compareText: compareText
};
