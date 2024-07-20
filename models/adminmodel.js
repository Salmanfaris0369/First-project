const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Admin = new Schema({
    adminName : {
        type : String,
        required : true
    },
    adminEmail : {
        type : String,
        required : true
    },
    adminPassword : {
        type : String,
        required : true
    }
});

module.exports = mongoose.model('Admin', Admin);