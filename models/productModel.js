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
    quantity:{
        type:Number,
        required:true
    }
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
    productOffer:{
        type:Schema.Types.ObjectId,
        ref:'offer',
        required:false
    },
    discountPrice:{
        type:Number,
        required:false,
        default :0
    },
    variants:[variantSchema],
   
    is_delete:{
        type:Boolean,
        default:false
    },
    orderCount: {
        type: Number,
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalReviews: {
        type: Number,
        default: 0
      },
      isFeatured: {
        type: Boolean,
        default: false
      },
      tags: [{
        type: String
      }]


},{timestamps:true});

module.exports=mongoose.model('product',productSchema)