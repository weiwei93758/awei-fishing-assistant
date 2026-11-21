// utils/region-mixin.js — 页面共用的地区切换逻辑
// 用法：
//   var M = require('../../utils/region-mixin.js');
//   Page(Object.assign({}, M.methods, {
//     data: Object.assign({}, M.baseData(), { /* 本页数据 */ }),
//     onLoad: function() { /* 初始化，必要时读取 bundle */ },
//     onShow: function() { this.syncRegion(); /* 再刷新本页数据 */ },
//     onRegionUpdated: function(region) { /* 地区变化后重取数据 */ }
//   }));

var regions = require('./regions.js');

function baseData() {
  var r = regions.getCurrent();
  return {
    regionNames: regions.getNames(),
    regionIndex: regions.getIndex(r.id),
    regionName: r.name,
    regionId: r.id,
    region: r,
    bundle: r.bundle
  };
}

var methods = {
  // 页面每次显示时调用：若其他页切换了地区，这里自动跟上并通知本页刷新
  syncRegion: function() {
    var r = regions.getCurrent();
    if (r.id !== this.data.regionId) {
      this.setData({
        regionNames: regions.getNames(),
        regionIndex: regions.getIndex(r.id),
        regionName: r.name,
        regionId: r.id,
        region: r,
        bundle: r.bundle
      });
      if (typeof this.onRegionUpdated === 'function') this.onRegionUpdated(r);
    }
    return r;
  },

  // 本页下拉选择器切换时触发
  onRegionChange: function(e) {
    var id = regions.getIdByIndex(e && e.detail ? e.detail.value : 0);
    if (!id || id === this.data.regionId) return;
    if (!regions.setCurrent(id)) return;
    var r = regions.find(id);
    this.setData({
      regionIndex: regions.getIndex(id),
      regionName: r.name,
      regionId: r.id,
      region: r,
      bundle: r.bundle
    });
    if (typeof this.onRegionUpdated === 'function') this.onRegionUpdated(r);
    wx.showToast({ title: '已切换到 ' + r.short, icon: 'none', duration: 1500 });
  }
};

module.exports = {
  baseData: baseData,
  methods: methods
};
