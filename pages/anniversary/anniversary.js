// pages/anniversary/anniversary.js
var A = require('../../utils/anniversary.js');
var regions = require('../../utils/regions.js');
var M = require('../../utils/region-mixin.js');
var STORAGE_KEY = 'fishing_records_v1';

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function buildQuickKeys(logs) {
  var quick = [];
  var seen = {};
  for (var i = 0; i < (logs || []).length; i++) {
    var parts = String(logs[i].date || '').split('-');
    if (parts.length !== 3) continue;
    var key = pad2(parseInt(parts[1], 10)) + '-' + pad2(parseInt(parts[2], 10));
    if (!seen[key]) { seen[key] = 1; quick.push(key); }
  }
  if (quick.length > 6) quick = quick.slice(0, 6);
  return quick;
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
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
  }),

  onLoad: function() {
    var t = A.getToday();
    var label = t.y + '年' + t.m + '月' + t.d + '日';
    this.setData({
      todayLabel: label,
      todayKey: A.dateKey(t.m, t.d),
      input: A.dateKey(t.m, t.d),
      quickKeys: buildQuickKeys(this.data.bundle.logs)
    });
  },

  onShow: function() {
    var before = this.data.regionId;
    this.syncRegion();
    if (this.data.regionId === before) this.loadDataset();
  },

  onRegionUpdated: function(region) {
    // 地区变了，历史样本与本机记录范围都变了，清空旧结果
    this.setData({
      result: null,
      error: '',
      compareText: '',
      hasQueried: false,
      quickKeys: buildQuickKeys(region.bundle.logs)
    });
    this.loadDataset();
  },

  loadDataset: function() {
    var that = this;
    var local = [];
    try {
      var raw = wx.getStorageSync(STORAGE_KEY);
      local = Array.isArray(raw) ? raw : [];
    } catch (e) { local = []; }
    // 只统计当前地区的本机记录；旧记录无 region 字段，归到广航
    local = local.filter(function(r) { return regions.isRecordOfRegion(r, that.data.regionId); });
    var ds = A.normalize(that.data.bundle.logs, local, that.data.bundle.anniversarySpot);
    this.setData({ dataset: ds });
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
}));
