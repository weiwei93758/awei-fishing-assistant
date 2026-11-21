const data = require('../../utils/data.js');
const M = require('../../utils/region-mixin.js');

const STORAGE_KEY = 'fishing_gear_v1';

function makeDayLabels() {
  const arr = [];
  for (let d = 1; d <= 30; d++) {
    let name;
    if (d === 10) name = '初十';
    else if (d === 20) name = '二十';
    else if (d === 30) name = '三十';
    else if (d < 10) name = '初' + '一二三四五六七八九'[d - 1];
    else if (d < 20) name = '十' + '一二三四五六七八九'[d - 11];
    else name = '廿' + '一二三四五六七八九'[d - 21];
    arr.push(name);
  }
  return arr;
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    dayLabels: makeDayLabels(),
    dayIndex: -1,
    selectedLabel: '',
    advice: null,
    gearList: [],
    safety: M.baseData().bundle.safety,
    sources: M.baseData().bundle.sources
  }),

  onLoad: function() {
    let saved = [];
    try {
      saved = wx.getStorageSync(STORAGE_KEY) || [];
    } catch (e) {
      saved = [];
    }
    const gearList = data.gear.map(function(text, i) {
      return { text: text, checked: saved.indexOf(i) !== -1 };
    });
    this.setData({ gearList: gearList });
  },

  onShow: function() {
    this.syncRegion();
  },

  onRegionUpdated: function(region) {
    this.setData({
      safety: region.bundle.safety,
      sources: region.bundle.sources,
      advice: null
    });
  },

  onDayChange: function(event) {
    const idx = Number(event.detail.value);
    this.setData({
      dayIndex: idx,
      selectedLabel: this.data.dayLabels[idx]
    });
  },

  checkTide: function() {
    const idx = this.data.dayIndex;
    if (idx < 0) {
      wx.showToast({ title: '请先选农历日期', icon: 'none' });
      return;
    }
    const advice = this.data.bundle.tideAdvice(idx + 1);
    this.setData({ advice: advice });
  },

  toggleGear: function(event) {
    const idx = Number(event.currentTarget.dataset.idx);
    const list = this.data.gearList.slice();
    list[idx].checked = !list[idx].checked;
    this.setData({ gearList: list });
    const checked = [];
    list.forEach(function(item, i) {
      if (item.checked) checked.push(i);
    });
    try {
      wx.setStorageSync(STORAGE_KEY, checked);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  copySource: function(event) {
    const url = event.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: function() {
        wx.showToast({ title: '链接已复制', icon: 'none' });
      }
    });
  }
}));
