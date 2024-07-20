const mongoose = require('mongoose')
const Schema=mongoose.Schema;



const variantSchema = new Schema({
    color:{
        type:String,
        required:true
    },
    images:{
        type:[String],
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    discountPrice:{
        type:Number,
        required:false
    },
    quantity:{
        type:Number,
        required:true
    },
   
    offer:{
        type:Schema.Types.ObjectId,
        ref:'offer',
        required:false
    },
},{_id:false});

const productSchema=new Schema({
    productName:{
        type:String,
        required:true
    },
    productCategory:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    productBrand:{
        type:Schema.Types.ObjectId,
        ref:"brand",
        required:true
    },
    productDescription:{
        type:String,
        required:true
    },
    productGender:{
        type:String,
        required:true
    },
    variants:[variantSchema],
    orderCount:{
        type:Number,
        default:0
    },
    is_delete:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

module.exports=mongoose.model('product',productSchema)