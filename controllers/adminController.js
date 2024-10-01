
  const User = require('../models/usermodel')
  const Admin = require('../models/adminmodel')
  const Order = require('../models/orderModel')
  const Address= require('../models/addressModel')
  const product = require('../models/productModel')
  const Coupon = require('../models/couponModel')
  const Offer = require('../models/offerModel')
  const Category = require('../models/categoryModel')
  const Wallet = require('../models/walletModel')
  const moment = require('moment');
  const ejs = require('ejs');
  const path = require('path');
  const ExcelJS = require('exceljs');
  const PDFDocument = require('pdfkit');
  const mongoose = require('mongoose');
  const ObjectId = mongoose.Types.ObjectId;
 
  const bcrypt=require('bcrypt')


  const loadLogin = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
        console.log(error);
    }
}
    
const verifyLogin=async(req,res)=>{

    try {
        const email=req.body.email
        const password=req.body.password
        const admindata=await Admin.findOne({adminEmail:email})
       
        if(admindata){
            const passwordMatch = await bcrypt.compare(password,admindata.adminPassword)
           
                 if(passwordMatch){
                    req.session.admin_id =admindata._id
                        res.redirect('/admin/dashboard');
                 }else{
                    res.render('login',{message:"incorrect password"})
                 }
        }else{
            res.render('login',{message:'Your email is incorrect'})
        }
    } catch (error) {
       console.log(error); 
    }
}



const loadUsers = async(req,res)=>{
    try { 
         const users=await User.find()

        res.render('users',{users:users})
    } catch (error) {
        console.log(error);
    }
}

const block_unblock = async(req, res) => {
    try {
        const userId = req.params.id;
        const action = req.body.action;
      

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (action === 'block') {
            user.is_blocked = true;
        } else if (action === 'unblock') {
            user.is_blocked = false;
        } else {
            return res.json({ success: false, message: 'Invalid action' });
        }

        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
}

const loadOrder=async(req,res)=>{
    try {  
        const orders = await Order.find().populate('user').sort({ createdAt: -1 }) 
          res.render('order',{orders : orders})
    } catch (error) {
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadOaderInfo = async(req,res)=>{
    try {  
       
        
          const orderID=req.query.orderId
          if(!orderID){
             return res.status(400).json({success:false,message:"order id is not found"})
         }
         const order =await Order.findOne({orderId:orderID}).populate('orderItems.product').populate('address').exec();
 
          if (!order) {
             return res.status(404).send('Order not found');
         }
         if (!order.address) {
           
            return res.status(404).send('Address not found for this order');
        }


         res.render('adminOrderInfo',{order});

        } catch (error) {
        console.log(error);
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const statusChange = async(req,res)=>{
    try {   
        const{orderId,itemId,currentStatus,user} = req.body

        const order = await Order.findOne({orderId:orderId})
        if(!order){
            return res.status(400).send({success:false,message:"order id not found"})
           }

           const updateOrder= await Order.findByIdAndUpdate(order._id,{orderStatus:currentStatus},{new:true})
           if(!updateOrder){
            return res.status(400).send({success:false,message:"order id not found"})
           }
           const itemIndex = order.orderItems.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(400).send({ success: false, message: "Item not found in order" });
        }
        order.orderItems[itemIndex].itemStatus = currentStatus;

        const allItemsCanceled = order.orderItems.every(item => item.itemStatus === 'Canceled');
         
        order.orderStatus = allItemsCanceled ? 'Canceled' : currentStatus;

        if(currentStatus === 'order returned'){

        if(order.paymentMethod ==='razorPay' || order.paymentMethod ==='wallet' && order.paymentStatus === 'paid'){
            const refundAmount = order.orderItems[itemIndex].price
            const userWallet = await Wallet.findOne({user:user})

            if(!userWallet){
                return res.status(400).send({ success: false, message: "userwallet not found" });
            }
                  userWallet.balance+=refundAmount
                  userWallet.transactions.push({
                    description: 'Order returned',
                    amount: +refundAmount,
                    balance: userWallet.balance
                });
                await userWallet.save();
        }
    }

        await order.save();

        return res.status(200).send({ success: true, message: "Order and item status updated successfully" });

      } catch (error) {
        console.log(error);
        return res.status(500).json({ success : false, error : "Some error occured"});
    }
}

  const loadCoupon = async(req,res)=>{
    try {  
      const page = parseInt(req.query.page) || 1; 
      const limit = 6; 
      const skip = (page - 1) * limit; 

      const totalCoupons = await Coupon.countDocuments();
      const coupons=await Coupon.find().skip(skip).limit(limit);

      const totalPages = Math.ceil(totalCoupons / limit);
              res.render('coupon',{
                coupons:coupons,
                currentPage: page,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
              })
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ success : false, error : "Some error occured"});
    }
  }

 
       

  const addCoupon= async(req,res)=>{
    try {   console.log(req.body,'aaaaaaaa');
    
        
        const { couponName : couponName,discountPercentage:discountPercentage,minimumPurchase :minimumPurchase,expiryDate :expiryDate,usageLimit :usageLimit,redeemAmount :redeemAmount}=req.body
       

        if(!couponName || !discountPercentage || !minimumPurchase || !expiryDate || !usageLimit){
            return res.status(400).json({success:false,message:"All fields are  required"})
        }
        
        const existCoupon=await Coupon.findOne({couponName}).collation({locale:'en',strength:2})
        if(existCoupon){
            return res.redirect('/coupon').status(400).json({success:false,message:"Coupon already exist"})
        }
        const newCoupon = new Coupon({
            code : couponName,
            discount:discountPercentage,
            minPurchase :minimumPurchase,
            expiryDate :expiryDate,
            usageLimit :usageLimit,
            redeemAmount :redeemAmount
        });
      

        const couponData = await newCoupon.save()
        res.status(200).json({success:true,message:'brand added',couponData})
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const editCoupon = async(req,res)=>{
    try {   const{couponId,code,discount,minPurchase,expiryDate,usageLimit,redeemAmount}=req.body
          
    if (!couponId || !code || !discount || !minPurchase || !expiryDate || !usageLimit || !redeemAmount) {
       return res.status(400).json({ success: false, message: "Missing required fields" });
   }

   const updateCoupon=await Coupon.findByIdAndUpdate(couponId,{$set:{
                                couponId,
                                code,
                                discount,
                                minPurchase,
                                expiryDate,
                                usageLimit,
                                redeemAmount
                            }},{new:true})
      
   
if(updateCoupon){
   res.status(201).json({success:true,message:"coupon updated successfully"})
}else{
   res.status(404).json({success:false,message:"coupon can't updated "})
}
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const deleteCoupon = async(req,res)=>{
   
    try {  const couponid=req.body.couponId

           const deleteCoupon = await Coupon.findByIdAndDelete(couponid)
           if (!deleteCoupon) {
            return res.status(404).json({success : false, message: 'Coupon not found' });
        }
        res.status(200).json({success:true, message: 'coupon deleted successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadOffer = async(req,res)=>{
    try {  const page = parseInt(req.query.page) || 1; 
            const limit = 6; 
            const skip = (page - 1) * limit; 

            const totalOffers = await Offer.countDocuments();
        
          const offers=await Offer.find().populate('productOffer').populate('categoryOffer') .skip(skip).limit(limit);
           const products= await product.find() 
           const categories= await Category.find()

           const totalPages = Math.ceil(totalOffers / limit);

        res.render('offer',{
          offers:offers,
          products:products,
          categories:categories,
          currentPage: page,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}




const addOffer = async(req,res)=>{
    try {    
        const{offerName,offerType,productOffer,categoryOffer,discountPercentage,maxRedeem,offerDescription}=req.body

        if (!offerName || !offerType || !discountPercentage || !maxRedeem || !offerDescription) {
           return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        
        const newOffer=new Offer({
            offerName,
            offerType,
            productOffer:offerType ==='product'?productOffer:null,
            categoryOffer:offerType === 'category'?categoryOffer:null,
            discountPercentage : Number(discountPercentage),
            maxRedeem : Number(maxRedeem),
            offerDescription
        
        })
      
        await newOffer.save()
       

        if(offerType ==='product'){
            const products = await product.findById(productOffer)
                  products.productOffer = newOffer._id
                  products.discountPrice = Math.ceil(products.variants[0].price - (products.variants[0].price * (discountPercentage / 100)))
                  console.log(products.discountPrice,'jjjjjjjj');
                  
                  await products.save()
        }else if(offerType === 'category'){
            const category = await Category.findById(categoryOffer)
              if(category){
                  category.offer =  newOffer._id
                  await category.save()
                  await applyOfferToProducts(category._id, newOffer._id, discountPercentage);
              }
        }

       
        if(newOffer){
        res.status(201).json({success:true,message:"offer added successfully"}) }
        
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const applyOfferToProducts = async (categoryId, offerId, discountPercentage) => {
    try {
        const products = await product.find({ productCategory: categoryId });

        for (const product of products) {
            product.productOffer = offerId;
            const existPrice = product.discountPrice
            product.discountPrice = Math.ceil(product.variants[0].price - (product.variants[0].price * (discountPercentage / 100)));
           
            if(product.discountPrice && existPrice>product.discountPrice){
            await product.save();
            }
        }

    } catch (error) {
        console.error('cannot able to apply', error);
    }
};



const deleteOffer = async (req, res) => {
   
    try {
        const offerId = req.body.offerId;
       
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        if (offer.offerType === 'product' && offer.productOffer) {

               
            const affectedProducts = await product.find({ productOffer: offerId });
           
      
            for (let product of affectedProducts) {
                const bestOffer = await findBestOffer(offerId,product._id, 'product');
               
                if (bestOffer) {
                    await applyOfferToProduct(product._id, bestOffer);
                }
            }

        
            const offerUpdatepro = await product.updateMany(
                { productOffer: offerId },
                { $unset: { productOffer: 1, discountPrice: 1 } }
            );
           
           
        }

        if (offer.offerType === 'category' && offer.categoryOffer) {
           
           const affectedCategory = await Category.find(offer.categoryOffer);
           const bestOffer = await findBestOffer(offer.categoryOffer, 'category');
          ;
            if (bestOffer) {
                
                await applyOfferToCategory(offer.categoryOffer, bestOffer);
            }

           
            const updateResult = await Category.findByIdAndUpdate(
                offer.categoryOffer,
                { $unset: { offer: 1 } },
                { new: true, runValidators: true }
            );

          await updateProductsInCategory(offerId,offer.categoryOffer);
        }


        await Offer.findByIdAndDelete(offerId);
        res.status(200).json({ success: true, message: 'Offer deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Some error occurred" });
    }
};

async function findBestOffer(offerId,id, type) {
    let offers;
    if (type === 'product') {
        offers = await Offer.find({ offerType: 'product', productOffer: id, _id: { $ne: offerId } }).sort({ discountPercentage: -1 });
    }else if(type === 'category') {
        offers = await Offer.find({ offerType: 'category', categoryOffer: id,_id: { $ne: offerId } }).sort({ discountPercentage: -1 });
    }else{
       
        return null; 
    }

    if (!offers || offers.length === 0) {
        
        return null; 
    }

    return offers[0];
}

async function applyOfferToProduct(productId, offer) {
    const products = await product.findById(productId);
    const discountPrice = Math.ceil(products.variants[0].price * (1 - offer.discountPercentage / 100));
    await product.updateOne(
        { _id: productId },
        { productOffer: offer._id, discountPrice: discountPrice }
    );
}

async function applyOfferToCategory(categoryId, offer) {
    const updateCategory = await Category.updateOne(
        { _id: categoryId },
        { offer: offer._id }
    );
   
}

async function updateProductsInCategory(offerId,categoryId) {
    const category = await Category.findById(categoryId).populate('offer');
    const products = await product.find({productCategory: categoryId });
   
    for (let item of products) {
        const productOffer = await findBestOffer(offerId,item._id, 'product');
       
        let updateFields = {};

        if (productOffer && (!category.offer || productOffer.discountPercentage > category.offer.discountPercentage)) {
         
            const discountPrice = Math.ceil(item.variants[0].price - (item.variants[0].price * (productOffer.discountPercentage / 100)));
            updateFields = {
                productOffer: productOffer._id,
                discountPrice: discountPrice
            };
            
        } else if (category.offer) {
           
            const discountPrice = Math.ceil(item.variants[0].price - (item.variants[0].price * (category.offer.discountPercentage / 100)));
            updateFields = {
                productOffer: category.offer._id,
                discountPrice: discountPrice
            };
        } else {
           
            updateFields = {
                $unset: { productOffer: 1 },
                discountPrice: item.variants[0].price  
            };
        }
      
        const updateResult = await product.findOne({ _id: item._id})
        updateResult.productOffer=updateFields.productOffer
        updateResult.discountPrice= updateFields.discountPrice
        updateResult.save()

    }
}

const  editOffer = async(req,res)=>{
    try {  
        const{offerId,offerName,offerType,productOffer,categoryOffer,discountPercentage,maxRedeem,offerDescription}=req.body

         if (!offerId || !offerName || !offerType || !discountPercentage || !maxRedeem || !offerDescription) {
         return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      
      const updateOffer=await Offer.findByIdAndUpdate(offerId,{$set :{
          offerName,
          offerType,
          productOffer:offerType ==='product'?productOffer:null,
          categoryOffer:offerType === 'category'?categoryOffer:null,
          discountPercentage : Number(discountPercentage),
          maxRedeem : Number(maxRedeem),
          offerDescription
          }},{new:true})
     
      if(offerType ==='product'){
          const products = await product.findById(productOffer)
                products.discountPrice = products.variants[0].price - (products.variants[0].price * (discountPercentage / 100))
                await products.save()
      }else if(offerType === 'category'){
          const category = await Category.findById(categoryOffer)
            if(category){
                category.offer =  updateOffer._id
                await category.save()
                await applyOfferToProducts(category._id, updateOffer._id, discountPercentage);
            }
      }

      if(updateOffer){
      res.status(201).json({success:true,message:"offer added successfully"}) }
      
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadSalesReport = async(req,res)=>{
    try{
      const page = parseInt(req.query.page) || 1; 
      const limit = 5; 
      const skip = (page - 1) * limit; 
      const { startDate, endDate, period } = req.query;
      const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
      const end = endDate ? new Date(endDate) : moment().endOf('day').toDate();

      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);

 
  const summaryPipeline = [
    {
      $match: {
        orderDate: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: {
            $reduce: {
              input: '$orderItems',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.itemStatus', 'delivered'] },
                  { $add: ['$$value', '$$this.price'] },
                  '$$value'
                ]
              }
            }
          }
        },
        totalOrders: {
          $sum: {
            $size: {
              $filter: {
                input: '$orderItems',
                as: 'item',
                cond: { $eq: ['$$item.itemStatus', 'delivered'] }
              }
            }
          }
        },
        totalDiscount: {
          $sum: {
            $reduce: {
              input: '$orderItems',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.itemStatus', 'delivered'] },
                  { $add: ['$$value', '$$this.discountPrice'] },
                  '$$value'
                ]
              }
            }
          }
        },
        totalCouponDeduction: { $sum: '$couponPrice' },
        totalQuantity: { $sum: { 
          $reduce: {
            input: '$orderItems',
            initialValue: 0,
            in: {
              $cond: [
                { $eq: ['$$this.itemStatus', 'delivered'] },
                { $add: ['$$value', '$$this.quantity'] },
                '$$value'
              ]
            }
          }
        } }
      }
    }
  ];

  // Product data pipeline
  const productPipeline = [
    {
      $match: {
        orderDate: { $gte: start, $lte: end }
      }
    },
    {
      $unwind: '$orderItems'
    },
    {
      $group: {
        _id: {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' },
          day: { $dayOfMonth: '$orderDate' },
          product: '$orderItems.product'
        },
        totalQuantity: { $sum: '$orderItems.quantity' },
        totalSales: { $sum:'$orderItems.price'},
        totalDiscount: { $sum: '$orderItems.discountPrice' }
       
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id.product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    {
      $project: {
        year: '$_id.year',
        month: '$_id.month',
        day: '$_id.day',
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            }
          }
        },
        productName: { $arrayElemAt: ['$productInfo.productName', 0] },
        totalQuantity: 1,
        totalSales: 1,
        totalDiscount: 1,
        totalCoupons: 1
      }
    },
    {
      $sort: { year: 1, month: 1, productName: 1 }
    }
  ];

  
  if (period === 'yearly') {
    productPipeline[2].$group._id = {
      year: { $year: '$orderDate' },
      product: '$orderItems.product'
    };
    delete productPipeline[4].$project.month;
    delete productPipeline[4].$project.day;
  } else if (period === 'monthly') {
    productPipeline[2].$group._id = {
      year: { $year: '$orderDate' },
      month: { $month: '$orderDate' },
      product: '$orderItems.product'
    };
  }

  const summary = await Order.aggregate(summaryPipeline);
  const productData = await Order.aggregate(productPipeline).skip(skip).limit(limit);
  const totalCount = await Order.aggregate(productPipeline).count("totalCount");
  
  const totalPages = Math.ceil(totalCount[0].totalCount/ limit);


  res.render('salesReport', {
    summary: summary[0] || { totalSales: 0, totalOrders: 0, totalDiscount: 0, totalCouponDeduction: 0, totalQuantity: 0 },
    productData,
    startDate: start,
    endDate: end,
    period: period || 'daily',
    currentPage: page,
    totalPages: totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  });

    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const downloadReport = async (req, res) => {
    try {
        const { format, startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : moment().subtract(7, 'days').toDate();
        const end = endDate ? new Date(endDate) : new Date();

       
        const summary = await Order.aggregate([
            {
                $match: {
                    orderDate: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                  _id: null,
                   totalSales: {
          $sum: {
            $reduce: {
              input: '$orderItems',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.itemStatus', 'delivered'] },
                  { $add: ['$$value', '$$this.price'] },
                  '$$value'
                ]
              }
            }
          }
        },
        totalOrders: {
          $sum: {
            $size: {
              $filter: {
                input: '$orderItems',
                as: 'item',
                cond: { $eq: ['$$item.itemStatus', 'delivered'] }
              }
            }
          }
        },
        totalDiscount: {
          $sum: {
            $reduce: {
              input: '$orderItems',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.itemStatus', 'delivered'] },
                  { $add: ['$$value', '$$this.discountPrice'] },
                  '$$value'
                ]
              }
            }
          }
        },
                  totalCouponDeduction: { $sum: '$couponPrice' },
                  totalQuantity: { $sum: { 
                    $reduce: {
                      input: '$orderItems',
                      initialValue: 0,
                      in: {
                        $cond: [
                          { $eq: ['$$this.itemStatus', 'delivered'] },
                          { $add: ['$$value', '$$this.quantity'] },
                          '$$value'
                        ]
                      }
                    }
                  } }
                }
              }
        ]);

        const productData = await Order.aggregate([
            {
                $match: {
                  orderDate: { $gte: start, $lte: end }
                }
              },
              {
                $unwind: '$orderItems'
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' },
                    day: { $dayOfMonth: '$orderDate' },
                    product: '$orderItems.product'
                  },
                  totalQuantity: { $sum: '$orderItems.quantity' },
                  totalSales: { $sum:'$orderItems.price'},
                  totalDiscount: { $sum: '$orderItems.discountPrice' }
                 
                }
              },
              {
                $lookup: {
                  from: 'products',
                  localField: '_id.product',
                  foreignField: '_id',
                  as: 'productInfo'
                }
              },
              {
                $project: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day',
                  date: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: {
                        $dateFromParts: {
                          year: '$_id.year',
                          month: '$_id.month',
                          day: '$_id.day'
                        }
                      }
                    }
                  },
                  productName: { $arrayElemAt: ['$productInfo.productName', 0] },
                  totalQuantity: 1,
                  totalSales: 1,
                  totalDiscount: 1,
                  totalCoupons: 1
                }
              },
              {
                $sort: { year: 1, month: 1, productName: 1 }
              }
        ]);

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const summarySheet = workbook.addWorksheet('Summary');
            const detailSheet = workbook.addWorksheet('Product Details');

            // Summary sheet
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 20 },
            ];

            summarySheet.addRows([
                { metric: 'Overall Sales', value: summary[0].totalSales.toFixed(2) },
                { metric: 'Overall Discounts', value: summary[0].totalDiscount.toFixed(2) },
                { metric: 'Overall Coupon Deduction', value: summary[0].totalCouponDeduction.toFixed(2) },
                { metric: 'Overall Orders', value: summary[0].totalOrders },
                { metric: 'Overall Quantity', value: summary[0].totalQuantity },
            ]);

            // Detail sheet
            detailSheet.columns = [
                { header: 'Year', key: 'year', width: 10 },
                { header: 'Month', key: 'month', width: 10 },
                { header: 'Product', key: 'productName', width: 30 },
                { header: 'Total Quantity', key: 'totalQuantity', width: 15 },
                { header: 'Total Sales', key: 'totalSales', width: 15 },
                { header: 'Total Discount', key: 'totalDiscount', width: 15 },
            ];

            detailSheet.addRows(productData);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

            await workbook.xlsx.write(res);
            res.end();
        } else if (format === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

            doc.pipe(res);

            doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke();

            // Add content to PDF
            doc.fontSize(23).text('Malefashion.shop', { align: 'center',underline:true });

            doc.fontSize(18).text('Sales Report', { align: 'center' });
            doc.moveDown();

            // Summary section
            doc.fontSize(14).text('Overall Summary', { underline: true });
            doc.moveDown();
            doc.fontSize(12).text(`Overall Sales: ₹${summary[0].totalSales.toFixed(2)}`);
            doc.text(`Overall Discounts: ₹${summary[0].totalDiscount.toFixed(2)}`);
            doc.text(`Overall Coupon Deduction: ₹${summary[0].totalCouponDeduction.toFixed(2)}`);
            doc.text(`Overall Orders: ${summary[0].totalOrders}`);
            doc.text(`Overall Quantity: ${summary[0].totalQuantity}`);
            doc.moveDown();

            // Product details section
            doc.fontSize(14).text('Product details', { underline: true });
            doc.moveDown();

            const tableTop = 280;
            const tableLeft = 70;
            const rowHeight = 20;
            const colWidths = [40, 50, 140, 80, 80, 80];

            // Table headers
            doc.font('Helvetica-Bold');
            ['Year', 'Month', 'Product', 'Quantity', 'Sales', 'Discount'].forEach((header, i) => {
                doc.text(header, tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
            });

            // Table rows
            doc.font('Helvetica');
            productData.forEach((product, index) => {
                const y = tableTop + (index + 1) * rowHeight;
                doc.text(product.year.toString(), tableLeft, y);
                doc.text(product.month.toString(), tableLeft + colWidths[0], y);
                doc.text(product.productName, tableLeft + colWidths[0] + colWidths[1], y);
                doc.text(product.totalQuantity.toString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2], y);
                doc.text(`₹${product.totalSales.toFixed(2)}`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);
                doc.text(`₹${product.totalDiscount.toFixed(2)}`, tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y);

                if (y > doc.page.height - 100) {
                    doc.addPage();
                    doc.fontSize(14).text('Product Details (Continued)', { underline: true });
                    doc.moveDown();
                }
            });

            doc.end();
        } else {
            res.status(400).send('Invalid format specified');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Some error occurred" });
    }
};

const getAdminDashboardAnalytics = async (req, res) => {
    try {
      const { period = 'monthly' } = req.query;
      const currentDate = new Date();
      currentDate.setHours(23, 59, 59, 999); 
      let startDate, groupId, sortStage;
    
      switch (period) {
        case 'yearly':
          startDate = new Date(currentDate.getFullYear() - 5, 0, 1);
          groupId = { year: { $year: '$orderDate' } };
          sortStage = { $sort: { '_id.year': -1 } };
          break;
        case 'monthly':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
          groupId = {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          };
          sortStage = { $sort: { '_id.year': -1, '_id.month': -1 } };
          break;
        case 'daily':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 29);
          groupId = {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            day: { $dayOfMonth: '$orderDate' }
          };
          sortStage = { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } };
          break;
        default:
          return res.status(400).render('error', { message: 'Invalid period' });
      }
  
      const pipeline = [
        { $match: { 
          orderDate: { 
            $gte: startDate,
            $lte: currentDate
          } 
        } },
        { $unwind: '$orderItems' },
        {
          $lookup: {
            from: 'products',
            localField: 'orderItems.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $group: {
            _id: groupId,
            totalRevenue: {
                $sum: {
                    $cond: [
                      { $eq: ['$orderItems.itemStatus', 'delivered'] },
                      '$orderItems.price',  
                      0  
                    ]
                  }
            },
            totalOrders: { 
              $sum: {
                $cond: [
                  { $eq: ['$orderItems.itemStatus', 'delivered'] },
                  1,  
                  0  
                ]
              }
            },
            cancelledOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'Canceled'] }, 1, 0] }
            },
            returnOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'order returned'] }, 1, 0] }
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] }
            },
            deliveredOrders: {
              $sum: { $cond: [{ $in: ['$orderStatus', ['delivered', 'shipped']] }, 1, 0] }
            },
            products: {
              $push: {
                productId: '$orderItems.product',
                productName: '$productInfo.productName',
                category: '$productInfo.categoryName',
                brand: '$productInfo.brandName',
                sales: {
                  $cond: [
                    { $eq: ['$orderItems.itemStatus', 'delivered'] },
                    { $subtract: [
                    '$orderItems.price',
                      '$orderItems.discountPrice'
                    ]},
                    0
                  ]
                },
                quantity: '$orderItems.quantity'
              }
            },
            categories: {
              $push: {
                category: '$productInfo.categoryName',
                sales: {
                  $cond: [
                    { $eq: ['$orderItems.itemStatus', 'delivered'] },
                    { $subtract: [
                   '$orderItems.price',
                      '$orderItems.discountPrice'
                    ]},
                    0
                  ]
                }
              }
            },
            brands: {
              $push: {
                brand: '$productInfo.brandName',
                sales: {
                  $cond: [
                    { $eq: ['$orderItems.itemStatus', 'delivered'] },
                    { $subtract: [
                   '$orderItems.price',
                      '$orderItems.discountPrice'
                    ]},
                    0
                  ]
                }
              }
            }
          }         
        },
        sortStage,
        {
          $project: {
            _id: 0,
            period: '$_id',
            totalRevenue: 1,
            totalOrders: 1,
            cancelledOrders: 1,
            returnOrders: 1,
            pendingOrders: 1,
            deliveredOrders: 1,
            topProducts: { $slice: [{ $sortArray: { input: '$products', sortBy: { sales: -1 } } }, 10] },
            topCategories: {
              $slice: [{
                $sortArray: {
                  input: {
                    $setUnion: {
                      $map: {
                        input: '$categories',
                        as: 'c',
                        in: {
                          category: '$$c.category',
                          sales: { $sum: '$$c.sales' }
                        }
                      }
                    }
                  },
                  sortBy: { sales: -1 }
                }
              }, 10]
            },
            topBrands: {
              $slice: [{
                $sortArray: {
                  input: {
                    $setUnion: {
                      $map: {
                        input: '$brands',
                        as: 'b',
                        in: {
                          brand: '$$b.brand',
                          sales: { $sum: '$$b.sales' }
                        }
                      }
                    }
                  },
                  sortBy: { sales: -1 }
                }
              }, 10]
            }
          }
        }
      ];
  
      const analyticsData = await Order.aggregate(pipeline);
     
      res.render('dashboard', { 
        analyticsData, 
        period,
        chartData: JSON.stringify(analyticsData)
      });
    } catch (error) {
      console.error('Error in getAdminDashboardAnalytics:', error);
      res.status(500).render('error', { message: 'Internal server error' });
    }
  };



const logOut = async(req,res)=>{
    try {  
        delete req.session.admin_id
        res.redirect('/admin/login')
        
      } catch (error) {
        console.log(error);
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}


module.exports={
    loadLogin,
    verifyLogin,
    loadUsers,
    block_unblock,
    loadOrder,
    loadOaderInfo,
    statusChange,
    loadCoupon, 
    addCoupon,
    editCoupon,
    deleteCoupon,
    loadOffer,
    addOffer,
    deleteOffer,
    editOffer,
    loadSalesReport,
    downloadReport,
    getAdminDashboardAnalytics,
    logOut
    
  }



