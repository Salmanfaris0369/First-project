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
            }

        }
    ],
    orderDate:{
        type:String
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'RazorPay'],
        
    },
    amount : {
        type : Number
    },
    AllDiscount : {
        type: Number
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
    returnStatus: { 
        type: String,
        enum: ['not requested', 'requested', 'returned'],
        default: 'not requested'
    },
    returnReason: {
        type: String,
        default: ''
    },
    orderId:{
        type: String
    }
  
   
}, { timestamps: true });


module.exports = mongoose.model("Order", Order);