// pages/region/region.js — 自定义地区与定位参数管理
const M = require('../../utils/region-mixin.js');
const R = require('../../utils/regions.js');

const ACCURACY = ['精确（已实地核对）', '约略（地图估算）', '待核实'];

function validateParams(p) {
  var lat = String(p.lat || '').trim();
  var lng = String(p.lng || '').trim();
  var radius = String(p.radiusKm || '').trim();
  if ((lat === '' && lng !== '') || (lat !== '' && lng === '')) return '经纬度需要同时填写';
  if (lat !== '') {
    var a = Number(lat);
    if (isNaN(a) || a < -90 || a > 90) return '纬度应在 -90 到 90 之间';
  }
  if (lng !== '') {
    var b = Number(lng);
    if (isNaN(b) || b < -180 || b > 180) return '经度应在 -180 到 180 之间';
  }
  if (radius !== '') {
    var c = Number(radius);
    if (isNaN(c) || c <= 0 || c > 500) return '范围半径应在 0 到 500 公里之间';
  }
  return '';
}

function emptyParamsForm() {
  return { lat: '', lng: '', radiusKm: '', accuracy: ACCURACY[0], tideLocation: '', note: '' };
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    accuracyOptions: ACCURACY,
    baseNames: R.regions.map(function(r) { return r.name; }),
    baseIds: R.regions.map(function(r) { return r.id; }),
    paramsForm: emptyParamsForm(),
    newForm: { name: '', baseIndex: 0 },
    customList: [],
    isCustom: false,
    currentBaseName: ''
  }),

  onShow: function() {
    this.syncRegion();
    this.loadAll();
  },

  onRegionUpdated: function() {
    this.loadAll();
  },

  loadAll: function() {
    var r = R.getCurrent();
    var p = r.params || {};
    var base = R.find(r.baseId) || r;
    this.setData({
      paramsForm: {
        lat: p.lat || '',
        lng: p.lng || '',
        radiusKm: p.radiusKm || '',
        accuracy: p.accuracy || ACCURACY[0],
        tideLocation: p.tideLocation || '',
        note: p.note || ''
      },
      isCustom: !!r.custom,
      currentBaseName: base.name,
      customList: R.getCustomRegions()
    });
  },

  onParamInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var form = this.data.paramsForm;
    form[field] = e.detail.value;
    this.setData({ paramsForm: form });
  },

  onAccuracyChange: function(e) {
    var form = this.data.paramsForm;
    form.accuracy = this.data.accuracyOptions[Number(e.detail.value)];
    this.setData({ paramsForm: form });
  },

  onNewInput: function(e) {
    var form = this.data.newForm;
    form.name = e.detail.value;
    this.setData({ newForm: form });
  },

  onBaseChange: function(e) {
    var form = this.data.newForm;
    form.baseIndex = Number(e.detail.value);
    this.setData({ newForm: form });
  },

  saveParams: function() {
    var that = this;
    var err = validateParams(this.data.paramsForm);
    if (err) {
      wx.showToast({ title: err, icon: 'none' });
      return;
    }
    var ok = R.setParams(that.data.regionId, that.data.paramsForm);
    if (!ok) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      return;
    }
    that.syncRegion();
    wx.showToast({ title: '定位参数已保存', icon: 'success' });
  },

  clearParams: function() {
    var that = this;
    wx.showModal({
      title: '清除定位参数',
      content: '确定清除当前地区的经纬度、范围与备注吗？地区本身和钓记不会删除。',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        R.clearParams(that.data.regionId);
        that.syncRegion();
        that.loadAll();
        wx.showToast({ title: '已清除', icon: 'none' });
      }
    });
  },

  createCustom: function() {
    var that = this;
    var name = String(this.data.newForm.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写地区名称', icon: 'none' });
      return;
    }
    var err = validateParams(this.data.paramsForm);
    if (err) {
      wx.showToast({ title: err, icon: 'none' });
      return;
    }
    var baseId = this.data.baseIds[this.data.newForm.baseIndex] || R.DEFAULT_ID;
    var id = R.addCustom({ name: name, baseRegion: baseId, params: this.data.paramsForm });
    if (!id) {
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
      return;
    }
    R.setCurrent(id);
    that.syncRegion();
    that.loadAll();
    var newForm = that.data.newForm;
    newForm.name = '';
    that.setData({ newForm: newForm });
    wx.showToast({ title: '已创建并切换到 ' + name, icon: 'none' });
  },

  useCustom: function(e) {
    var id = e.currentTarget.dataset.id;
    if (!R.setCurrent(id)) return;
    this.syncRegion();
    this.loadAll();
    wx.showToast({ title: '已切换', icon: 'none' });
  },

  deleteCustom: function() {
    var that = this;
    if (!this.data.isCustom) {
      wx.showToast({ title: '内置地区不能删除', icon: 'none' });
      return;
    }
    var id = this.data.regionId;
    wx.showModal({
      title: '删除自定义地区',
      content: '删除后该地区不再出现在下拉菜单。已保存的钓记仍在本机，但暂时无法按该地区查看。确定删除吗？',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        R.removeCustom(id);
        R.setCurrent(R.DEFAULT_ID);
        that.syncRegion();
        that.loadAll();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  }
}));
