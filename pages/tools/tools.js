const data = require('../../utils/data.js');
const M = require('../../utils/region-mixin.js');

const STORAGE_KEY = 'fishing_gear_v1';

// 用当前地区的定位参数拼外部查询链接；本小程序不联网，只复制到剪贴板
function buildTideLinks(region) {
  var p = (region && region.params) || {};
  var lat = String(p.lat || '').trim();
  var lng = String(p.lng || '').trim();
  var name = (region && region.name) || '钓点';
  var links = [];
  if (lat !== '' && lng !== '') {
    links.push({
      id: 'windyTide',
      name: 'Windy 潮汐图层',
      desc: '直接定位到你设置的坐标',
      url: 'https://www.windy.com/-Tides-tides?tides,' + lat + ',' + lng + ',8'
    });
    links.push({
      id: 'windyWave',
      name: 'Windy 风浪图层',
      desc: '看风场与浪高',
      url: 'https://www.windy.com/-Waves-waves?waves,' + lat + ',' + lng + ',8'
    });
    links.push({
      id: 'amap',
      name: '高德地图定位',
      desc: '在你设置的坐标扎点',
      url: 'https://uri.amap.com/marker?position=' + lng + ',' + lat + '&name=' + encodeURIComponent(name)
    });
  }
  links.push({
    id: 'nmefc',
    name: '国家海洋预报台',
    desc: '官方潮汐预报入口，需自行定位',
    url: 'https://www.nmefc.cn/'
  });
  return { links: links, hasCoord: lat !== '' && lng !== '', coord: lat && lng ? (lat + '，' + lng) : '' };
}

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
    sources: M.baseData().bundle.sources,
    tide: buildTideLinks(M.baseData()),
    tideLocation: M.baseData().tideLocation
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
      advice: null,
      tide: buildTideLinks(region),
      tideLocation: region.tideLocation
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

  copyTideLink: function(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.tide.links.find(function(x) { return x.id === id; });
    if (!item) return;
    wx.setClipboardData({
      data: item.url,
      success: function() {
        wx.showToast({ title: '已复制 ' + item.name + ' 链接', icon: 'none', duration: 2000 });
      },
      fail: function() {
        wx.showToast({ title: '复制失败，请重试', icon: 'none' });
      }
    });
  },

  goRegionSettings: function() {
    wx.navigateTo({ url: '/pages/region/region' });
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
