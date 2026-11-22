// utils/region-mixin.js — 页面共用的地区切换逻辑
// 用法：
//   var M = require('../../utils/region-mixin.js');
//   Page(Object.assign({}, M.methods, {
//     data: Object.assign({}, M.baseData(), { /* 本页数据 */ }),
//     onLoad: function() { /* 初始化，必要时读取 bundle */ },
//     onShow: function() { this.syncRegion(); /* 再刷新本页数据 */ },
//     onRegionUpdated: function(region) { /* 地区或定位参数变化后重取数据 */ }
//   }));

var regions = require('./regions.js');

function regionData(r) {
  return {
    regionNames: regions.getNames(),
    regionIndex: regions.getIndex(r.id),
    regionName: r.name,
    regionId: r.id,
    region: r,
    bundle: r.bundle
  };
}

function baseData() {
  return regionData(regions.getCurrent());
}

var methods = {
  // 页面每次显示时调用：地区、定位参数或自定义地区列表变化都会同步
  syncRegion: function() {
    var r = regions.getCurrent();
    var prev = this.data.region || {};
    var changed = (r.id !== this.data.regionId) || (r.rev !== prev.rev) || (r.name !== this.data.regionName);
    this.setData(regionData(r));
    if (changed && typeof this.onRegionUpdated === 'function') this.onRegionUpdated(r);
    return r;
  },

  // 本页下拉选择器切换时触发
  onRegionChange: function(e) {
    var id = regions.getIdByIndex(e && e.detail ? e.detail.value : 0);
    if (!id || id === this.data.regionId) return;
    if (!regions.setCurrent(id)) return;
    var r = regions.find(id);
    this.setData(regionData(r));
    if (typeof this.onRegionUpdated === 'function') this.onRegionUpdated(r);
    wx.showToast({ title: '已切换到 ' + r.short, icon: 'none', duration: 1500 });
  },

  // 地区设置（自定义地区 / 定位参数）
  goRegionSettings: function() {
    wx.navigateTo({ url: '/pages/region/region' });
  },

  // 海域类型信息（外海 / 内弯 / 养殖圈）
  goZones: function() {
    wx.navigateTo({ url: '/pages/zone/zone' });
  }
};

module.exports = {
  baseData: baseData,
  methods: methods
};
