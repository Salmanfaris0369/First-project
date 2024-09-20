const mongoose= require('mongoose')
const Schema=mongoose.Schema;
const Cart=new Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product',
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    productName:{
        type:String,
        required:true
    },
    ProductPrice:{
        type:Number,
        required:true
    },
    productDiscountPrice:{
        type:Number,

    },
    productColor:{
        type:String,
        required:true
    },
    productQuantity:{
        type:Number,
        required:true
    },
    cartPrice:{
        type:Number,
        required:true
    },
    availableQuantity:{
        type:Number
    }
})
module.exports = mongoose.model('Cart',Cart)