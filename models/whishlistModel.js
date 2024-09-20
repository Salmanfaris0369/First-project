const mongoose = require('mongoose')
const Schema = mongoose.Schema;
const Whishlist = new Schema({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required : true
    },
    productId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'product',
        required : true
    },
    productImage :{
        type: [String],
        required : true
    },
    productPrice :{
        type: Number,
        required:true
    },
    productName:{
        type:String,
        required:true
    },
    productColor:{
        type:String,
        required:true
    }
});
module.exports = mongoose.model("Whishlist",Whishlist);