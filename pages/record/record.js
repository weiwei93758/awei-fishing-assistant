// pages/record/record.js
const M = require('../../utils/region-mixin.js');
const regions = require('../../utils/regions.js');
const Z = require('../../utils/zone-info.js');
const store = require('../../utils/record-store.js');

function buildZoneOptions(regionId) {
  return Z.getZones(regionId).map(function(z) { return z.name; }).concat(['未标注']);
}

function buildForm() {
  return {
    date: '',
    spotIndex: 0,
    structureIndex: 0,
    tideSizeIndex: 0,
    tidePhaseIndex: 0,
    weatherIndex: 0,
    windLevelIndex: 0,
    windDirIndex: 0,
    waterIndex: 0,
    gearIndex: 0,
    fishIndex: 0,
    zoneIndex: 0,
    catchText: '',
    note: '',
    images: []
  };
}

function optionIndex(list, value) {
  if (!Array.isArray(list) || value === undefined || value === null) return 0;
  var i = list.indexOf(value);
  return i >= 0 ? i : 0;
}

// 回显时用前缀/后缀匹配，避免选项自身含空格或斜杠时被切错
function tideSizeIndex(tide, list) {
  var s = String(tide || '');
  for (var i = 0; i < list.length; i++) {
    if (s.indexOf(list[i] + ' / ') === 0) return i;
  }
  return 0;
}

function tidePhaseIndex(tide, list) {
  var s = String(tide || '');
  for (var i = 0; i < list.length; i++) {
    if (s.indexOf(' / ' + list[i]) >= 0) return i;
  }
  return 0;
}

function windLevelIndex(wind, list) {
  var s = String(wind || '');
  for (var i = 0; i < list.length; i++) {
    if (s.indexOf(list[i] + ' ') === 0) return i;
  }
  return 0;
}

function windDirIndex(wind, list) {
  var s = String(wind || '');
  for (var i = 0; i < list.length; i++) {
    if (s.indexOf(' ' + list[i]) >= 0) return i;
  }
  return 0;
}

function regionLists() {
  var all = regions.getAll();
  return {
    regionNames: all.map(function(r) { return r.name; }),
    regionIds: all.map(function(r) { return r.id; })
  };
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    opts: M.baseData().bundle.formOptions,
    zoneNames: buildZoneOptions(M.baseData().regionId),
    form: buildForm(),
    records: [],
    today: '',
    editingId: '',
    isEditing: false,
    regionNames: regionLists().regionNames,
    regionIds: regionLists().regionIds
  }),

  onLoad: function() {
    var now = new Date();
    var yyyy = now.getFullYear();
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var dd = String(now.getDate()).padStart(2, '0');
    var today = yyyy + '-' + mm + '-' + dd;
    this.setData({ today: today });
    var f = this.data.form;
    f.date = today;
    this.setData({ form: f });
    this.loadRecords();
  },

  onShow: function() {
    this.syncRegion();
    this.setData(Object.assign({
      zoneNames: buildZoneOptions(this.data.regionId)
    }, regionLists()));
    this.loadRecords();
  },

  onRegionUpdated: function(region) {
    var opts = region.bundle.formOptions;
    var form = this.data.form;
    // 切换地区时结束编辑，避免把一条记录改到别的地区名下
    form = buildForm();
    form.date = this.data.today;
    this.setData(Object.assign({
      opts: opts,
      form: form,
      zoneNames: buildZoneOptions(region.id),
      editingId: '',
      isEditing: false
    }, regionLists()));
    this.loadRecords();
  },

  loadRecords: function() {
    var that = this;
    try {
      var records = store.readAll();
      // 旧记录没有 region 字段，按广航处理，保证原有流程不受影响
      records = records.filter(function(r) { return regions.isRecordOfRegion(r, that.data.regionId); });
      records.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
      that.setData({ records: records });
    } catch (e) {
      that.setData({ records: [] });
    }
  },

  onPickerChange: function(e) {
    var field = e.currentTarget.dataset.field;
    var idx = Number(e.detail.value);
    var form = this.data.form;
    form[field] = idx;
    this.setData({ form: form });
  },

  onDateChange: function(e) {
    var form = this.data.form;
    form.date = e.detail.value;
    this.setData({ form: form });
  },

  onInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var form = this.data.form;
    form[field] = e.detail.value;
    this.setData({ form: form });
  },

  chooseImage: function() {
    var that = this;
    var rest = 6 - this.data.form.images.length;
    if (rest <= 0) {
      wx.showToast({ title: '最多 6 张', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: rest,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        var paths = res.tempFiles.map(function(f) { return f.tempFilePath; });
        var form = that.data.form;
        form.images = form.images.concat(paths);
        that.setData({ form: form });
      }
    });
  },

  removeImage: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    var form = this.data.form;
    form.images.splice(idx, 1);
    this.setData({ form: form });
  },

  previewImage: function(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    wx.previewImage({
      current: this.data.form.images[idx],
      urls: this.data.form.images
    });
  },

  buildRecord: function(existing) {
    var f = this.data.form;
    var o = this.data.opts;
    var base = existing || {};
    return {
      id: base.id || ('r' + Date.now()),
      region: base.region || this.data.regionId,
      regionName: base.regionName || this.data.regionName,
      date: f.date,
      spot: o.spots[f.spotIndex],
      structure: o.structure[f.structureIndex],
      tide: o.tideSize[f.tideSizeIndex] + ' / ' + o.tidePhase[f.tidePhaseIndex],
      weather: o.weather[f.weatherIndex],
      wind: o.windLevel[f.windLevelIndex] + ' ' + o.windDir[f.windDirIndex],
      water: o.water[f.waterIndex],
      gear: o.gear[f.gearIndex],
      fish: o.fish[f.fishIndex],
      zone: this.data.zoneNames[f.zoneIndex] || '未标注',
      catchText: f.catchText || '未填写',
      note: f.note || '',
      images: f.images.slice(),
      createdAt: base.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  },

  saveRecord: function() {
    var that = this;
    var f = this.data.form;
    if (!f.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    var editingId = this.data.editingId;
    var existing = editingId ? store.findById(editingId) : null;
    if (editingId && !existing) {
      wx.showToast({ title: '原记录已不存在，请重新填写', icon: 'none' });
      that.resetForm();
      return;
    }
    var record = that.buildRecord(existing);
    if (!store.upsert(record)) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      return;
    }
    // 把临时图片拷到本机永久目录后回写路径
    that.persistImages(record.id);
    wx.showToast({
      title: editingId ? '已更新这条记录' : ('已保存到' + that.data.regionName),
      icon: 'none'
    });
    that.resetForm();
    that.loadRecords();
  },

  persistImages: function(recordId) {
    var fs = wx.getFileSystemManager();
    var dir = wx.env.USER_DATA_PATH + '/fishing_images';
    try {
      fs.accessSync(dir);
    } catch (e) {
      try { fs.mkdirSync(dir, true); } catch (e2) { return; }
    }
    var records = store.readAll();
    var rec = null;
    for (var i = 0; i < records.length; i++) {
      if (records[i] && records[i].id === recordId) { rec = records[i]; break; }
    }
    if (!rec || !rec.images || rec.images.length === 0) return;
    var saved = [];
    for (var j = 0; j < rec.images.length; j++) {
      var src = rec.images[j];
      var extMatch = src.match(/\.(jpg|jpeg|png|gif|webp)/i);
      var ext = extMatch ? extMatch[0] : '.png';
      var dest = dir + '/' + rec.id + '_' + j + ext;
      try {
        fs.copyFileSync(src, dest);
        saved.push(dest);
      } catch (err) {
        saved.push(src);
        wx.showToast({ title: '有图片未能永久保存', icon: 'none' });
      }
    }
    rec.images = saved;
    store.writeAll(records);
  },

  editRecord: function(e) {
    var id = e.currentTarget.dataset.id;
    var r = store.findById(id);
    if (!r) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      return;
    }
    var o = this.data.opts;
    var zn = this.data.zoneNames;
    var f = buildForm();
    f.date = r.date || this.data.today;
    f.spotIndex = optionIndex(o.spots, r.spot);
    f.structureIndex = optionIndex(o.structure, r.structure);
    f.tideSizeIndex = tideSizeIndex(r.tide, o.tideSize);
    f.tidePhaseIndex = tidePhaseIndex(r.tide, o.tidePhase);
    f.weatherIndex = optionIndex(o.weather, r.weather);
    f.windLevelIndex = windLevelIndex(r.wind, o.windLevel);
    f.windDirIndex = windDirIndex(r.wind, o.windDir);
    f.waterIndex = optionIndex(o.water, r.water);
    f.gearIndex = optionIndex(o.gear, r.gear);
    f.fishIndex = optionIndex(o.fish, r.fish);
    f.zoneIndex = optionIndex(zn, r.zone);
    f.catchText = r.catchText === '未填写' ? '' : (r.catchText || '');
    f.note = r.note || '';
    f.images = Array.isArray(r.images) ? r.images.slice() : [];
    this.setData({ form: f, editingId: id, isEditing: true });
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
  },

  cancelEdit: function() {
    this.resetForm();
    wx.showToast({ title: '已取消编辑', icon: 'none' });
  },

  onTransferPick: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var idx = Number(e.detail.value);
    var targetId = this.data.regionIds[idx];
    var targetName = this.data.regionNames[idx];
    if (!targetId) return;
    if (targetId === this.data.regionId) {
      wx.showToast({ title: '这条记录已在当前地区', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '转移记录',
      content: '把这条记录转移到「' + targetName + '」？转移后在当前地区不再显示，记录本身不会删除。',
      confirmColor: '#0e6b8a',
      success: function(res) {
        if (!res.confirm) return;
        if (!store.moveOne(id, targetId, targetName)) {
          wx.showToast({ title: '转移失败，请重试', icon: 'none' });
          return;
        }
        that.loadRecords();
        if (that.data.editingId === id) that.resetForm();
        wx.showToast({ title: '已转移到' + targetName, icon: 'none' });
      }
    });
  },

  deleteRecord: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条出钓记录吗？删除后无法恢复。建议先在「自定义定位」页备份。',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        try {
          if (!store.remove(id)) {
            wx.showToast({ title: '删除失败', icon: 'none' });
            return;
          }
          if (that.data.editingId === id) that.resetForm();
          that.loadRecords();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },

  previewRecordImage: function(e) {
    var urls = e.currentTarget.dataset.urls;
    var idx = Number(e.currentTarget.dataset.idx);
    wx.previewImage({ current: urls[idx], urls: urls });
  },

  resetForm: function() {
    var f = buildForm();
    f.date = this.data.today;
    this.setData({ form: f, editingId: '', isEditing: false });
  }
}));
