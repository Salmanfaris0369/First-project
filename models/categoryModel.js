const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Category = new Schema({
    categoryName : {
        type : String,
        required : true
    },
    offer : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'offer'
    },
    is_delete : {
        type : Boolean,
        default : false
    }
});

module.exports = mongoose.model('Category', Category)