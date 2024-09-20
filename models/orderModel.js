const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Order = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', 
       
    },
    orderItems: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product', 
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
           
            price: {
                type: Number,
                required: true
            },
            color:{
                type:String
            },
            itemStatus:{
                type:String,
                default:'Pending',
                required:true 
            },
            returnStatus: { 
                type: String,
                enum: ['not requested', 'requested', 'returned'],
                default: 'not requested'
            },
            returnReason: {
                type: String,
                default: ''
            },
            discountPrice : {
                type: Number,
                default:0
            }

        }
    ],
    orderDate:{
        type: Date,
        default: Date.now
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'razorPay','wallet'],
        
    },
    amount : {
        type : Number
    },
    
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default:'unpaid'
        
    },
    orderStatus:{
        type: String,
        enum: ['pending', 'shipped', 'delivered', 'Canceled' ,'order returned'],
        default: 'pending'
    },
   
    orderId:{
        type: String
    },
    couponPrice :{
        type: Number,
        default:0
          },
    razorpayOrderId : {
        type : String
    }
  
   },{ timestamps: true });


module.exports = mongoose.model("Order", Order);