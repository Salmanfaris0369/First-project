
const mongoose=require('mongoose')

const userschema = mongoose.Schema({

    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:false
    },
    image:{
        type:String,
        required:false
    },
    password:{
        type:String,
        required:false
    },
    resetPasswordToken:String,
     resetPasswordExpires:Date,
    is_blocked:{
        type:Boolean,
        default:false
    }
    
})

module.exports = mongoose.model('user',userschema)