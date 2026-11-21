const data = require('../../utils/data.js');

Page({
  data: {
    links: data.externalLinks,
    spots: data.spots
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
  }
});
