// pages/anniversary/anniversary.js
var A = require('../../utils/anniversary.js');
var HISTORY = require('../../utils/fishing-log.js').logs;
var STORAGE_KEY = 'fishing_records_v1';

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

Page({
  data: {
    input: '',
    todayLabel: '',
    todayKey: '',
    today: null,
    dataset: [],
    result: null,
    error: '',
    compareText: '',
    maxTotal: 1,
    hasQueried: false,
    quickKeys: []
  },

  onLoad: function() {
    var t = A.getToday();
    var label = t.y + '年' + t.m + '月' + t.d + '日';
    // 快捷日期：历史里有记录的月日（去重，最多 6 个）+ 今天
    var quick = [];
    var seen = {};
    for (var i = 0; i < HISTORY.length; i++) {
      var parts = HISTORY[i].date.split('-');
      var key = pad2(parseInt(parts[1], 10)) + '-' + pad2(parseInt(parts[2], 10));
      if (!seen[key]) { seen[key] = 1; quick.push(key); }
    }
    if (quick.length > 6) quick = quick.slice(0, 6);
    this.setData({
      todayLabel: label,
      todayKey: A.dateKey(t.m, t.d),
      input: A.dateKey(t.m, t.d),
      quickKeys: quick
    });
  },

  onShow: function() {
    this.loadDataset();
  },

  loadDataset: function() {
    var local = [];
    try {
      var raw = wx.getStorageSync(STORAGE_KEY);
      local = Array.isArray(raw) ? raw : [];
    } catch (e) { local = []; }
    var ds = A.normalize(HISTORY, local);
    this.setData({ dataset: ds });
    // 若已查询过，数据变化后自动刷新结果
    if (this.data.hasQueried && this.data.input) this.doQuery();
  },

  onInput: function(e) {
    this.setData({ input: e.detail.value });
  },

  clearInput: function() {
    this.setData({ input: '', result: null, error: '', hasQueried: false, compareText: '' });
  },

  useQuick: function(e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ input: key });
    this.doQuery(key);
  },

  useToday: function() {
    this.setData({ input: this.data.todayKey });
    this.doQuery(this.data.todayKey);
  },

  onQueryTap: function() {
    this.doQuery();
  },

  doQuery: function(inputOverride) {
    var t = A.getToday();
    var value = typeof inputOverride === 'string' ? inputOverride : this.data.input;
    var parsed = A.parseInput(value, t);
    if (!parsed.ok) {
      this.setData({ result: null, error: parsed.error, hasQueried: true, compareText: '' });
      return;
    }
    var r = A.querySameDay(this.data.dataset, parsed.key, t);
    var max = 1;
    for (var i = 0; i < r.byYear.length; i++) {
      if (r.byYear[i].total > max) max = r.byYear[i].total;
    }
    var years = [];
    for (var j = 0; j < r.byYear.length; j++) {
      var g = r.byYear[j];
      years.push({
        year: g.year,
        total: g.total,
        known: g.known,
        unknown: g.unknown,
        text: g.text,
        width: Math.max(4, Math.round(g.total / max * 100))
      });
    }
    this.setData({
      result: r,
      years: years,
      error: '',
      hasQueried: true,
      compareText: A.compareText(r, t),
      queryLabel: parsed.hasYear ? (parsed.y + '年' + parsed.m + '月' + parsed.d + '日') : (parsed.m + '月' + parsed.d + '日')
    });
  },

  goRecord: function() {
    wx.switchTab({ url: '/pages/record/record' });
  }
});
