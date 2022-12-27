
const mongoose = require('mongoose');
// const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const OwlSchema = new Schema({
    hostCheck: Boolean,
    metricsCheck: Boolean,
    hostName: String,
    ipAddress: String,
    userName: String,
    userPass: String,
    port: [{name: String, port: Number, status: String, http: Boolean, path: String, method: String, statuscode: Number}],
    hostMetrics: [{diskStatus: [], memStatus: [], cpuStatus: [], DiskTotal: Number, DiskUsage: Number, DiskFree: Number, MemTotal: Number, MemUsage: Number, MemFree: Number, CpuTotal: Number, CpuUsage: Number, CpuFree: Number, CPU: Number, uptime: String}],
    linkTo: [{hostName: String, ipAddress: String, port: Number}],
    groupName: String,
    clusterName: String,
    envName: String,
    vmName: String,
    status: String,
    note: String
}, {
    // http://mongoosejs.com/docs/guide.html#timestamps
    timestamps: true
});
module.exports = mongoose.model('service-host', OwlSchema);
