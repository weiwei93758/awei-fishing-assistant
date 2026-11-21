// pages/words/words.js
var WORDS = require('../../utils/fishing-words.js').groups;

Page({
  data: {
    groups: WORDS,
    activeId: 'harvest',
    current: WORDS[0],
    keyword: '',
    searchResults: [],
    searching: false,
    total: 0
  },

  onLoad: function() {
    var total = 0;
    for (var i = 0; i < WORDS.length; i++) total += WORDS[i].words.length;
    this.setData({ total: total });
  },

  switchGroup: function(e) {
    var id = e.currentTarget.dataset.id;
    var current = null;
    for (var i = 0; i < WORDS.length; i++) {
      if (WORDS[i].id === id) current = WORDS[i];
    }
    if (current) this.setData({ activeId: id, current: current, searching: false, keyword: '' });
  },

  onInput: function(e) {
    var kw = e.detail.value.trim();
    if (!kw) {
      this.setData({ searching: false, searchResults: [], keyword: '' });
      return;
    }
    var results = [];
    for (var i = 0; i < WORDS.length; i++) {
      var g = WORDS[i];
      for (var j = 0; j < g.words.length; j++) {
        var item = g.words[j];
        if (item.w.indexOf(kw) >= 0 || item.mean.indexOf(kw) >= 0 || item.p.indexOf(kw) >= 0) {
          results.push({ w: item.w, p: item.p, mean: item.mean, group: g.name, color: g.color });
        }
      }
    }
    this.setData({ searching: true, keyword: kw, searchResults: results });
  },

  clearSearch: function() {
    this.setData({ searching: false, searchResults: [], keyword: '' });
  }
});
