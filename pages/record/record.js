// pages/record/record.js
const { formOptions } = require('../../utils/form-options.js');

const STORAGE_KEY = 'fishing_records_v1';

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
    catchText: '',
    note: '',
    images: []
  };
}

Page({
  data: {
    opts: formOptions,
    form: buildForm(),
    records: [],
    today: ''
  },

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
    this.loadRecords();
  },

  loadRecords: function() {
    var that = this;
    try {
      var raw = wx.getStorageSync(STORAGE_KEY);
      var records = Array.isArray(raw) ? raw : [];
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

  saveRecord: function() {
    var that = this;
    var f = this.data.form;
    var o = formOptions;
    if (!f.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    var record = {
      id: 'r' + Date.now(),
      date: f.date,
      spot: o.spots[f.spotIndex],
      structure: o.structure[f.structureIndex],
      tide: o.tideSize[f.tideSizeIndex] + ' / ' + o.tidePhase[f.tidePhaseIndex],
      weather: o.weather[f.weatherIndex],
      wind: o.windLevel[f.windLevelIndex] + ' ' + o.windDir[f.windDirIndex],
      water: o.water[f.waterIndex],
      gear: o.gear[f.gearIndex],
      fish: o.fish[f.fishIndex],
      catchText: f.catchText || '未填写',
      note: f.note || '',
      images: f.images.slice(),
      createdAt: Date.now()
    };

    try {
      var raw = wx.getStorageSync(STORAGE_KEY);
      var records = Array.isArray(raw) ? raw : [];
      records.push(record);
      wx.setStorageSync(STORAGE_KEY, records);

      // 把临时图片拷到本机永久目录后回写路径
      that.persistImages(record, records);

      wx.showToast({ title: '已保存', icon: 'success' });
      that.setData({ form: buildForm() });
      var nf = that.data.form;
      nf.date = that.data.today;
      that.setData({ form: nf });
      that.loadRecords();
    } catch (e) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  persistImages: function(record, records) {
    if (!record.images || record.images.length === 0) return;
    var fs = wx.getFileSystemManager();
    var dir = wx.env.USER_DATA_PATH + '/fishing_images';
    try {
      fs.accessSync(dir);
    } catch (e) {
      try { fs.mkdirSync(dir, true); } catch (e2) { return; }
    }
    var saved = [];
    for (var i = 0; i < record.images.length; i++) {
      var src = record.images[i];
      var extMatch = src.match(/\.(jpg|jpeg|png|gif|webp)/i);
      var ext = extMatch ? extMatch[0] : '.png';
      var dest = dir + '/' + record.id + '_' + i + ext;
      try {
        fs.copyFileSync(src, dest);
        saved.push(dest);
      } catch (err) {
        saved.push(src);
      }
    }
    record.images = saved;
    try {
      wx.setStorageSync(STORAGE_KEY, records);
    } catch (e2) {}
  },

  deleteRecord: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条出钓记录吗？删除后无法恢复。',
      confirmColor: '#c9522f',
      success: function(res) {
        if (!res.confirm) return;
        try {
          var raw = wx.getStorageSync(STORAGE_KEY);
          var records = Array.isArray(raw) ? raw : [];
          records = records.filter(function(r) { return r.id !== id; });
          wx.setStorageSync(STORAGE_KEY, records);
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
    this.setData({ form: buildForm() });
    var nf = this.data.form;
    nf.date = this.data.today;
    this.setData({ form: nf });
  }
});
