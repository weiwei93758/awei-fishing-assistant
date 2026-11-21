const M = require('../../utils/region-mixin.js');

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    logs: M.baseData().bundle.logs,
    insights: M.baseData().bundle.insights,
    boundaries: M.baseData().bundle.boundaries
  }),

  onShow: function() {
    this.syncRegion();
  },

  onRegionUpdated: function(region) {
    this.setData({
      logs: region.bundle.logs,
      insights: region.bundle.insights,
      boundaries: region.bundle.boundaries
    });
  }
}));
