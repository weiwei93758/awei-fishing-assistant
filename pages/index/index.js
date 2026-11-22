const data = require('../../utils/data.js');
const M = require('../../utils/region-mixin.js');

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    links: data.externalLinks,
    spots: M.baseData().bundle.spots
  }),

  onLoad: function() {
    // 地区数据已在 baseData 中载入；保留钩子便于日后扩展
  },

  onShow: function() {
    this.syncRegion();
  },

  onRegionUpdated: function(region) {
    this.setData({ spots: region.bundle.spots });
  },

  copyLink(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.links.find(function(x) { return x.id === id; });
    if (!item) return;
    wx.setClipboardData({
      data: item.url,
      success: function() {
        wx.showToast({
          title: '已复制 ' + item.name + ' 网址',
          icon: 'none',
          duration: 2000
        });
      },
      fail: function() {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      }
    });
  },

  goSpots() {
    wx.switchTab({ url: '/pages/spots/spots' });
  },

  goLog() {
    wx.switchTab({ url: '/pages/log/log' });
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  goAnniversary() {
    wx.navigateTo({ url: '/pages/anniversary/anniversary' });
  },

  goWords() {
    wx.navigateTo({ url: '/pages/words/words' });
  },

  goTools() {
    wx.navigateTo({ url: '/pages/tools/tools' });
  },

  goData() {
    wx.navigateTo({ url: '/pages/data/data' });
  }
}));
