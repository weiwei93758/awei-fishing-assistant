const data = require('../../utils/data.js');

function buildCells(months) {
  return months.map(function(v, i) {
    let cls = 'm-off';
    if (v === 1) cls = 'm-hot';
    else if (v === 2) cls = 'm-mid';
    return { idx: i, n: i + 1, cls: cls };
  });
}

Page({
  data: {
    fishes: [],
    seaGuide: data.seaGuide
  },
  onLoad: function() {
    const fishes = data.fishes.map(function(f) {
      return Object.assign({}, f, { monthCells: buildCells(f.months) });
    });
    this.setData({ fishes: fishes });
  }
});
