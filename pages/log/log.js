const logData = require('../../utils/fishing-log.js');

Page({
  data: {
    logs: logData.logs,
    insights: logData.insights,
    boundaries: logData.boundaries
  }
});
