// pages/region/region.js — 自定义地区与定位参数管理
const M = require('../../utils/region-mixin.js');
const R = require('../../utils/regions.js');
const S = require('../../utils/record-store.js');

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
    currentBaseName: '',
    backupInfo: null
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
    var bi = S.backupInfo();
    if (bi) {
      var d = new Date(bi.at);
      bi.text = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
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
      customList: R.getCustomRegions(),
      backupInfo: bi
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
    var baseId = R.DEFAULT_ID;
    var list = R.getCustomRegions();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { baseId = list[i].baseRegion || R.DEFAULT_ID; break; }
    }
    var base = R.find(baseId);
    var baseName = base ? base.name : '广航';
    wx.showModal({
      title: '删除自定义地区',
      content: '删除前会先备份全部钓记，再把该地区的钓记转移到「' + baseName + '」。备份失败会取消删除。确定继续吗？',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        if (!S.backup()) {
          wx.showToast({ title: '备份失败，已取消删除', icon: 'none' });
          return;
        }
        var moved = S.relabel(id, baseId, baseName);
        if (moved < 0) {
          wx.showToast({ title: '记录迁移失败，已取消删除', icon: 'none' });
          return;
        }
        if (!R.removeCustom(id)) {
          wx.showToast({ title: '删除失败，记录已保留', icon: 'none' });
          return;
        }
        R.setCurrent(R.DEFAULT_ID);
        that.syncRegion();
        that.loadAll();
        wx.showToast({ title: '已删除，' + moved + ' 条记录转移到' + baseName, icon: 'none' });
      }
    });
  },

  backupNow: function() {
    var that = this;
    if (!S.backup()) {
      wx.showToast({ title: '备份失败，请重试', icon: 'none' });
      return;
    }
    that.loadAll();
    wx.showToast({ title: '已备份全部钓记', icon: 'success' });
  },

  restoreBackup: function() {
    var that = this;
    var info = S.backupInfo();
    if (!info) {
      wx.showToast({ title: '没有可恢复的备份', icon: 'none' });
      return;
    }
    var when = new Date(info.at);
    var stamp = when.getFullYear() + '-' + String(when.getMonth() + 1).padStart(2, '0') + '-' + String(when.getDate()).padStart(2, '0');
    wx.showModal({
      title: '恢复备份',
      content: '将用 ' + stamp + ' 的备份（' + info.count + ' 条）覆盖当前全部钓记，当前的新修改会丢失。确定恢复吗？',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        if (!S.restoreBackup()) {
          wx.showToast({ title: '恢复失败', icon: 'none' });
          return;
        }
        that.loadAll();
        wx.showToast({ title: '已恢复 ' + info.count + ' 条记录', icon: 'success' });
      }
    });
  }
}));
