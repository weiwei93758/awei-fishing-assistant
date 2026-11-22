// pages/zone/zone.js — 外海 / 内弯 / 养殖圈 信息的录入与修改
const M = require('../../utils/region-mixin.js');
const Z = require('../../utils/zone-info.js');

function loadZones(regionId) {
  return Z.getZones(regionId);
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    zones: loadZones(M.baseData().regionId),
    hasCustom: Z.hasCustom(M.baseData().regionId)
  }),

  onShow: function() {
    this.syncRegion();
    this.refresh();
  },

  onRegionUpdated: function() {
    this.refresh();
  },

  refresh: function() {
    this.setData({
      zones: loadZones(this.data.regionId),
      hasCustom: Z.hasCustom(this.data.regionId)
    });
  },

  onFieldInput: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var field = e.currentTarget.dataset.field;
    var zones = this.data.zones.slice();
    if (!zones[idx]) return;
    zones[idx] = Object.assign({}, zones[idx]);
    zones[idx][field] = e.detail.value;
    this.setData({ zones: zones });
  },

  save: function() {
    var that = this;
    var ok = Z.saveZones(this.data.regionId, this.data.zones);
    wx.showToast({
      title: ok ? '已保存到本机' : '保存失败，请重试',
      icon: ok ? 'success' : 'none'
    });
    if (ok) that.refresh();
  },

  reset: function() {
    var that = this;
    wx.showModal({
      title: '恢复默认',
      content: '确定把当前地区的三类海域信息恢复为默认值吗？你填写的内容会被清除。',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        Z.resetZones(that.data.regionId);
        that.refresh();
        wx.showToast({ title: '已恢复默认', icon: 'none' });
      }
    });
  }
}));
