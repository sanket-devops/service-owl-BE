
const mongoose = require('mongoose');
// const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const OwlSchema = new Schema({
    hostCheck: Boolean,
    metricsCheck: Boolean,
    hostName: String,
    ipAddress: String,
    sshPort: Number,
    userName: String,
    userPass: String,
    privateKey: String,
    port: [{name: String, port: Number, status: String, http: Boolean, path: String, method: String, statuscode: Number}],
    hostMetrics: [{diskStatus: [], memStatus: [], cpuStatus: [], networkStatus: [], DiskTotal: String, DiskUsage: String, DiskFree: String, MemTotal: String, MemUsage: String, MemFree: String, downloadRx: String, uploadTx: String, CpuTotal: String, CpuUsage: String, CpuFree: String, CPU: String, uptime: String}],
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

const InternetSchema = new Schema({
    speedTest: [],
    internetCheck: Boolean
}, {
    // http://mongoosejs.com/docs/guide.html#timestamps
    timestamps: true
});

const serviceHost = mongoose.model('service-host', OwlSchema);
const speedTest = mongoose.model('speed-test', InternetSchema);

module.exports = {serviceHost, speedTest}
