const M = require('../../utils/region-mixin.js');

function buildCells(months) {
  return months.map(function(v, i) {
    let cls = 'm-off';
    if (v === 1) cls = 'm-hot';
    else if (v === 2) cls = 'm-mid';
    return { idx: i, n: i + 1, cls: cls };
  });
}

function buildFishes(bundle) {
  return (bundle.fishes || []).map(function(f) {
    return Object.assign({}, f, { monthCells: buildCells(f.months || []) });
  });
}

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    fishes: buildFishes(M.baseData().bundle),
    seaGuide: M.baseData().bundle.seaGuide
  }),

  onShow: function() {
    this.syncRegion();
  },

  onRegionUpdated: function(region) {
    this.setData({
      fishes: buildFishes(region.bundle),
      seaGuide: region.bundle.seaGuide
    });
  }
}));
