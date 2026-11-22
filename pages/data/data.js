// pages/data/data.js — 本机数据导出与导入
const B = require('../../utils/data-backup.js');

Page({
  data: {
    items: [],
    hasData: false,
    exportInfo: ''
  },

  onShow: function() {
    this.refresh();
  },

  refresh: function() {
    var items = B.summary();
    this.setData({
      items: items,
      hasData: items.some(function(x) { return x.count > 0; })
    });
  },

  doExport: function() {
    var that = this;
    var result = B.exportData();
    if (result.count === 0) {
      wx.showToast({ title: '没有可导出的数据', icon: 'none' });
      return;
    }
    var fs = wx.getFileSystemManager();
    var dir = wx.env.USER_DATA_PATH;
    var name = 'fishing-backup-' + that.stamp() + '.json';
    var path = dir + '/' + name;
    var content = JSON.stringify(result.payload);
    try {
      fs.writeFileSync(path, content, 'utf8');
    } catch (e) {
      wx.showToast({ title: '写入备份文件失败', icon: 'none' });
      return;
    }
    // 优先转发文件到微信会话，可另存到手机/电脑；不支持时退化为复制内容
    if (wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath: path,
        fileName: name,
        success: function() {
          that.setData({ exportInfo: '已导出 ' + name + '（' + result.count + ' 类数据），可转发到微信会话另存。' });
          wx.showToast({ title: '已转发备份文件', icon: 'success' });
        },
        fail: function() {
          that.copyFallback(content, name, result.count);
        }
      });
    } else {
      that.copyFallback(content, name, result.count);
    }
  },

  copyFallback: function(content, name, count) {
    var that = this;
    wx.setClipboardData({
      data: content,
      success: function() {
        that.setData({ exportInfo: '当前环境不支持转发文件，已把备份内容复制到剪贴板（' + name + '，' + count + ' 类数据），可粘贴保存到备忘录或电脑。' });
        wx.showToast({ title: '备份内容已复制', icon: 'success' });
      },
      fail: function() {
        wx.showToast({ title: '导出失败，请重试', icon: 'none' });
      }
    });
  },

  stamp: function() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  },

  chooseImport: function() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: function(res) {
        var file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        that.askMode(file.path);
      },
      fail: function() {}
    });
  },

  askMode: function(path) {
    var that = this;
    wx.showModal({
      title: '导入方式',
      content: '合并：保留现有数据，按 id 去重后加入备份内容（推荐）。\n覆盖：用备份内容直接覆盖对应数据，当前新增内容会丢失。',
      confirmText: '合并',
      cancelText: '覆盖',
      success: function(res) {
        that.applyImport(path, res.confirm ? 'merge' : 'replace');
      }
    });
  },

  applyImport: function(path, mode) {
    var that = this;
    var text;
    try {
      text = wx.getFileSystemManager().readFileSync(path, 'utf8');
    } catch (e) {
      wx.showToast({ title: '读取文件失败', icon: 'none' });
      return;
    }
    var payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      wx.showToast({ title: '文件不是有效的 JSON', icon: 'none' });
      return;
    }
    var result = B.importData(payload, mode);
    if (!result.ok) {
      wx.showToast({ title: result.msg, icon: 'none' });
      return;
    }
    that.refresh();
    wx.showModal({
      title: '导入完成',
      content: '写入 ' + result.written + ' 类数据；新增记录 ' + result.added + ' 条，覆盖同 id 记录 ' + result.updated + ' 条。',
      showCancel: false
    });
  }
});
