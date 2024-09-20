const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const offerSchema = new Schema({
    offerName : {
        type : String,
        required : true
    },
    offerType : {
        type : String,
        enum : ['product','category'],
        required : true
    },
    productOffer : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'product',
        required: function(){
            return this.offerType ==='product'
        },
        default : null
    },
    categoryOffer : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Category',
        required: function(){
            return this.offerType ==='category'
        },
        default : null

    },

    discountPercentage: {
        type: Number,
        required: true
    },
    maxRedeem: {
        type: Number,
        required:true
    },
    offerDescription: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//validating to assure that one of productOffer || categoryoffer || brand offer is populated
offerSchema.pre('save',function(next){
    if(this.offerType === 'product' && !this.productOffer){
        return next(new Error('product offer is required for product type offers'))
    }
    if(this.offerType === 'category' && !this.categoryOffer){
        return next(new Error('category offer is required for category type offers'))
    }
    if(this.productOffer && this.categoryOffer){
        return next(new Error('only one of productoffer or category offer should be populated'))
    }
    next();
});

module.exports = mongoose.model('offer',offerSchema);
