const mongoose=require('mongoose')
const Schema =mongoose.Schema

const brand=new Schema({
    brandName:{
        type:String,
        required:true
    },
    is_delete:{
        type:String,
        default:false
    }
})

module.exports=mongoose.model('brand',brand)