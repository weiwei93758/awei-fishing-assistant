const M = require('../../utils/region-mixin.js');

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    spots: M.baseData().bundle.spots
  }),

  onShow: function() {
    this.syncRegion();
  },

  onRegionUpdated: function(region) {
    this.setData({ spots: region.bundle.spots });
  }
}));
