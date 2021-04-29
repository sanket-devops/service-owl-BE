
const mongoose = require('mongoose');
// const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const OwlSchema = new Schema({
    hostName: String,
    ipAddress: String,
    port: [{name: String, port: Number, status: String}],
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
