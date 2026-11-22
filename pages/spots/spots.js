const M = require('../../utils/region-mixin.js');
const Z = require('../../utils/zone-info.js');

Page(Object.assign({}, M.methods, {
  data: Object.assign({}, M.baseData(), {
    spots: M.baseData().bundle.spots,
    zones: Z.getZones(M.baseData().regionId),
    hasZoneCustom: Z.hasCustom(M.baseData().regionId)
  }),

  onShow: function() {
    this.syncRegion();
    this.refreshZones();
  },

  onRegionUpdated: function(region) {
    this.setData({ spots: region.bundle.spots });
    this.refreshZones();
  },

  refreshZones: function() {
    this.setData({
      zones: Z.getZones(this.data.regionId),
      hasZoneCustom: Z.hasCustom(this.data.regionId)
    });
  }
}));
