const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const Order = require('../models/orderModel') 
const Product = require('../models/productModel')
const User = require('../models/usermodel')
const Whishlist = require('../models/whishlistModel')
const Wallet = require('../models/walletModel')
const Coupon = require('../models/couponModel')
const mongoose = require('mongoose');
const RazorPay = require('razorpay')
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const razorpayInstance = new RazorPay({
    key_id: process.env.key_id,
    key_secret:process.env.key_secret
})




const downloadOrderPDF = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId: orderId }).populate('orderItems.product').populate('address').exec();
        
        if (!order) {
            return res.status(404).send('Order not found');
        }

        const doc = new PDFDocument();
        const filename = `order-${orderId}.pdf`;

        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Add content to PDF
        doc.fontSize(18).text('Order Details', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Order ID: ${order.orderId}`);
        doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        doc.text(`Order Status: ${order.orderStatus}`);
        doc.moveDown();

        doc.fontSize(14).text('Items:');
        order.orderItems.forEach(item => {
            doc.fontSize(12).text(`- ${item.product.productName}`);
            doc.text(`  Color: ${item.color}, Quantity: ${item.quantity}, Price: ₹${item.price}`);
        });

        doc.moveDown();
        doc.fontSize(14).text('Delivery Address:');
        doc.fontSize(12).text(`${order.address.addressStreet}, ${order.address.addressPost}`);
        doc.text(`${order.address.addressCity}, ${order.address.addressDistrict}`);
        doc.text(`${order.address.addressState}, ${order.address.addressPin}`);

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while generating the PDF');
    }
};


const generateUniqueOrderID = async () => {
    let orderID;
    let existingOrder;
    do {
        orderID = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        existingOrder = await Order.findOne({ orderID });
    } while (existingOrder);
    return orderID;
};

const loadCheckout = async(req,res)=>{
    try {  
      

         const uId=req.session.user_id
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found"})
        }
            const address= await Address.find({user_id:uId})
            if(!address){
                return res.status(400).json({success:false,message:"address not found"})
            }

            const totalCart = await Cart.countDocuments({ userId: uId });

            const cart = await Cart.find({userId:uId}).populate('productId')
            if(!cart){
                return res.status(400).json({success:false,message:"cart not found"})
            }
            const wallet = await Wallet.findOne({user:uId})
            if(!wallet){
                return res.status(400).json({success:false,message:"wallet not found"})
            }
            const coupon = await Coupon.find()
            if(!wallet){
                return res.status(400).json({success:false,message:"wallet not found"})
            }

          

         res.render('checkout',{cart:cart,
            address:address,
            wallet:wallet,
            coupon:coupon
         })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}




const placeOrder=async(req,res)=>{
    try {  
        const{ address,addressId, items,total,paymentOption, deliveryDate,couponvalue}=req.body
      
        const uId=req.session.user_id
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found"})
        }
        if(paymentOption === 'wallet'){
            const userWallet = await Wallet.findOne({user:uId})
          
            const userBalance = Number(userWallet.balance);
            let newSub = total.replace('₹','')
            let orderSubtotal = Number(newSub);
         

            if(userBalance >= orderSubtotal){
                const orderDetails = { address, addressId, items, total, paymentOption,deliveryDate,couponvalue } 
                await createOrder(uId,orderDetails,'paid')
            
                  userWallet.balance-=orderSubtotal
                  userWallet.transactions.push({
                    description: 'Order placed',
                    amount: -orderSubtotal,
                    balance: userWallet.balance
                });
               
               
                await userWallet.save()
               
                return res.status(200).json({success:true,message:"order placed successfuly"})
            }else{
                return res.status(400).json({success:false,message:"your wallet had insufficient fund"})
            }
        }
              console.log(total,'ordersubbb');
              let newSub = total.replace('₹','')
            let orderSubtotal = Number(newSub);
        if(paymentOption === 'cod' && orderSubtotal>1000){

            return res.status(400).json({success:false,message:"cod not allowed for more than 1000 rupees"})
        }else{   
               const deliAddress= await Address.findById(addressId)
               if(!deliAddress){
                return res.status(400).json({success:false,message:"please provide your address"})
               }
              let discountPrice;
            const uniqueOrderID = await generateUniqueOrderID();
            let coupon = Math.abs(couponvalue.replace('₹', ''))
           
           
            const newOrder = new Order({
                user: uId,
                address: deliAddress,
                paymentMethod: paymentOption,
                orderItems: items.map(item => ({
                    product: item.productId,
                    quantity: item.quantity,
                    price: parseFloat(item.productPrice.replace(/[^0-9.-]+/g, "")* parseInt(item.quantity.replace(/[^0-9.-]+/g, ""))),
                    color:item.productColor
                })),
                amount :parseFloat(total.replace('₹', '')),
                orderId: uniqueOrderID,
                orderDate:new Date(),
                couponPrice:coupon
              
            })

            await newOrder.save()

            for (let item of newOrder.orderItems) {
                console.log(item.product, 'Product ID');
                const product = await Product.findOne({ _id: item.product });
                finaldiscount =product.productOffer?product.variants[0].price *item.quantity-product.discountPrice*item.quantity:0
                     console.log(finaldiscount,'finalll');
                     
                       item.discountPrice=finaldiscount
                       }
                   newOrder.save()

          for (let item of items) {
            console.log(item.productId, 'Product ID');
            const product = await Product.findOne({ _id: item.productId });
            console.log(product, 'Product Found');
            
            if (product) {
               
                
                let variantIndex = -1;
                for (let i = 0; i < product.variants.length; i++) {
                    if (product.variants[i].color === item.productColor) {
                        variantIndex = i;
                        break;
                    }
                }
                
                
                if (variantIndex !== -1) {
                    product.variants[variantIndex].quantity -= item.quantity;
                    product.orderCount += item.quantity;
                    await product.save();
                    await Cart.findOneAndDelete({ userId: uId });
                    res.status(201).json({ message: 'Order placed successfully' });
                } else {
                    res.status(400).json({ message: 'Product variant not found to update quantity' });
                }
            } else {
                res.status(400).json({ message: 'Product not found' });
            }
        }
        
     }
       } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}


const orderVerifyRazorpay = async(req,res)=>{
    const { orderCreationId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    try {   console.log(req.body,'bbbbbbbbbbb');
        const generatedSignature = crypto
        .createHmac('sha256', process.env.key_secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      
        console.log(razorpaySignature,'signature');
        if (generatedSignature === razorpaySignature) {
        const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
        console.log(order,'fffffffff');
        if (!order) {
            return res.status(400).json({ error: 'Order not found' });
        }
       
        if (order.paymentStatus === 'paid') {
            return res.status(200).json({ message: 'Payment already verified' });
        }
        order.paymentStatus = 'paid';
        await order.save();
        res.status(200).json({ success:true,message: 'Payment verified successfully'});
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature' });
    }
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const orderRazorpayOrder = async(req,res)=>{
    try {   const { orderId } = req.body;
        console.log(orderId);
    
    const order = await Order.findById(orderId);
    if (!order) {
        console.log('Order not found');
        return res.status(400).json({ error: 'Order not found' });
    }

   
    const totalAmount = order.orderItems.reduce((acc, item) => {
        if (item.orderStatus !== 'Canceled') {
            return acc + item.price ;
        }
        return acc;
    }, 0);

    if (totalAmount <= 0) {
        console.log('Invalid total amount');
        return res.status(400).json({ error: 'Invalid total amount' });
    }

    const options = {
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `receipt_${order.orderId}`,
        payment_capture: '1'
    };
    const razorpayOrder = await razorpayInstance.orders.create(options);
    console.log(razorpayOrder,'dsdsds');
    order.razorpayOrderId = razorpayOrder.id;
    console.log(order.razorpayOrderId,'salman');
    await order.save();
    res.status(200).json({
        success:true,
        key: process.env.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayOrderId: razorpayOrder.id
    });
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}



const razorpayOrder = async(req,res)=>{
    try {  console.log(req.body.total,'rasss');
        const options = {
            amount: parseFloat(req.body.total.replace('₹', '')) * 100, 
            currency: "INR",
            receipt: "order_receipt_" + Date.now()
        };

        const order = await razorpayInstance.orders.create(options);
        console.log(order,'iuygfds');
        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            razorpayKeyId: process.env.key_id
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const handleFailedPayment = async(req,res)=>{
    try {
        await createOrder(req.session.user_id, req.body.orderId,'unpaid');
        res.status(200).json({ success: true, error: "order placed payment still unpaid" });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const verifyRazorpay = async(req,res)=>{
    try {  
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderDetails } = req.body;
             console.log(req.body.orderDetails,'dddddd');
        const generatedSignature = crypto
            .createHmac('sha256', process.env.key_secret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');
    
        if (generatedSignature === razorpaySignature) {
            // Payment is successful, create the order
            await createOrder(req.session.user_id, orderDetails,'paid');
            res.json({ success: true });
        } else {
             
            res.status(400).json({ success: false, error: "Payment verification failed" });
        }
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

async function createOrder(userId, orderDetails,paymentStatus) {
    const { address, addressId, items, total, paymentOption,couponvalue } = orderDetails;

    const deliAddress= await Address.findById(addressId)
    if(!deliAddress){
     return res.status(400).json({success:false,message:"please provide your address"})
    }
   
 const uniqueOrderID = await generateUniqueOrderID();
      console.log(couponvalue,'acac');

      if(!couponvalue){
        return res.status(400).json({success:false,message:"coupon value not found"})
       }
      

        let coupon = Math.abs(couponvalue.replace('₹', ''))
           

 const newOrder = new Order({
     user: userId,
     address: deliAddress,
     paymentMethod: paymentOption,
     orderItems: items.map(item => ({
         product: item.productId,
         quantity: item.quantity,
         price: parseFloat(item.productPrice.replace(/[^0-9.-]+/g, "")* parseInt(item.quantity.replace(/[^0-9.-]+/g, ""))),
         color:item.productColor
     })),
     amount :parseFloat(total.replace('₹', '')),
     orderId: uniqueOrderID,
     orderDate:new Date(),
      couponPrice:coupon,
     paymentStatus: paymentStatus
   
 })

 await newOrder.save()

 for (let item of newOrder.orderItems) {
    console.log(item.product, 'Product ID');
    const product = await Product.findOne({ _id: item.product });
    console.log(product, 'Product Foundkkk');
      console.log(product.productOffer,'ooooo');
      console.log(product.variants[0].price,'ppppp');
      console.log(item.quantity,'llll');
      console.log(product.discountPrice,'kkkkk');
      
       finaldiscount =product.productOffer?product.variants[0].price *item.quantity-product.discountPrice*item.quantity:0
         console.log(finaldiscount,'finalll');
         
           item.discountPrice=finaldiscount
          
          
           
         }
       newOrder.save()



for (let item of items) {
 console.log(item.productId, 'Product ID');
 const product = await Product.findOne({ _id: item.productId });
 console.log(product, 'Product Found');
 
 if (product) {
    
     
     let variantIndex = -1;
     for (let i = 0; i < product.variants.length; i++) {
         if (product.variants[i].color === item.productColor) {
             variantIndex = i;
             break;
         }
     }
     
     
     if (variantIndex !== -1) {
         product.variants[variantIndex].quantity -= item.quantity;
         product.orderCount += item.quantity;
         await product.save();
         await Cart.findOneAndDelete({ userId: userId });
       
     } else {
        throw new Error('Product variant not found to update quantity');
     }
 } else {
    throw new Error('Product not found');

 }
}
}



const loadOrder = async (req, res) => {
    try {
        const uID = req.session.user_id;
        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit; 

       
        const totalOrders = await Order.countDocuments({ user: uID });

        
        const orders = await Order.find({ user: uID })
            .populate('orderItems')
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        
        const totalPages = Math.ceil(totalOrders / limit);

        console.log('Fetched orders:', orders);

        res.render('order', {
            orders: orders,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error in loadOrder:', error);
        res.status(500).json({ success: false, error: "Some error occurred" });
    }
};

const loadOrderinfo = async(req,res)=>{
    
    try {    console.log(req.query.orderId,'salman');
           const uID = req.session.user_id
           if(!uID){
            return res.status(400).json({success:false,message:"USER NOT FOUND"})
           }
             const orderID=req.query.orderId
             if(!orderID){
                return res.status(400).json({success:false,message:"order id is not found"})
            }
            const order =await Order.findOne({orderId:orderID}).populate('orderItems.product').populate('address').exec();
    
             if (!order) {
                return res.status(404).send('Order not found');
            }

            const user = await User.findById(uID);

            res.render('orderinfo',{ order, user});

    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const cancelOrder = async(req,res)=>{
    try {   console.log(req.body);
           const {orderId,itemId,itemColor}=req.body
           console.log(orderId);
           console.log(itemId);
           const uId = req.session.user_id
           const order = await Order.findOne({orderId:orderId})
    
           if (!order) {
            return res.status(400).send({ success: false, message: "Order not found" });
        }


        const itemIndex = order.orderItems.findIndex(item => 
            item._id.toString() === itemId && item.color === itemColor
        );

        if (itemIndex === -1) {
            return res.status(400).send({ success: false, message: "Item not found in the order" });
        }


        
        if(order.paymentMethod ==='razorPay' || order.paymentMethod ==='wallet' && order.paymentStatus === 'paid'){
            const refundAmount = order.orderItems[itemIndex].price
            const userWallet = await Wallet.findOne({user:uId})

            if(!userWallet){
                return res.status(400).send({ success: false, message: "userwallet not found" });
            }
                  userWallet.balance+=refundAmount
                  userWallet.transactions.push({
                    description: 'Order canceled',
                    amount: +refundAmount,
                    balance: userWallet.balance
                });
                await userWallet.save();
        }


       
        order.orderItems[itemIndex].itemStatus = 'Canceled';

        const allItemsCanceled = order.orderItems.every(item => item.itemStatus === 'Canceled');

       
        if (allItemsCanceled) {
            order.orderStatus = 'Canceled';
        }

        
        await order.save();

          
           const item = order.orderItems.find(item => item.color === itemColor);
           console.log(item,'fffffffffffff');
           const productId= item.product       
           const product = await Product.findById({_id:productId})

           if(product){
                
            const variantIndex = product.variants.findIndex(variant => variant.color === itemColor);
        
    
            if (variantIndex !== -1) {
                
                product.variants[variantIndex].quantity += item.quantity;
                // product.orderCount += item.quantity;
                await product.save();
                              }
                          }

           res.status(200).json({ success: true, message: "Order canceled successfully" })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const returnOrder = async(req,res)=>{
    try {  console.log(req.body);
          const{orderId,itemId,color,returnReason} = req.body
            const order = await Order.findOne({orderId:orderId})
            if(!order){
                return res.status(400).send({ success: false, message: "Order not found" });
            }

            const itemIndex = order.orderItems.findIndex(item => 
                item._id.toString() === itemId && item.color === color
            );
         console.log(itemIndex);
            if (itemIndex === -1) {
                return res.status(400).send({ success: false, message: "Item not found in the order" });
            }

            order.orderItems[itemIndex].returnStatus = 'requested';
            order.orderItems[itemIndex].returnReason = returnReason;
              console.log(order.orderItems[itemIndex].returnStatus,'status');
          order.save()
          res.status(200).json({ success: true, message: "return order successfull" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}


const loadWhishlist = async(req,res)=>{
    try {  const uId=req.session.user_id
           const page = parseInt(req.query.page) || 1; 
          const limit = 5; 
          const skip = (page - 1) * limit; 
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found "})
        }
        const totalWhish = await Whishlist.countDocuments({ userId: uId });


        const whishlist= await Whishlist.find({ userId: uId}).populate('productId') .skip(skip).limit(limit);
        const totalPages = Math.ceil(totalWhish / limit);

     
         res.render('whishlist',{whishlist:whishlist,
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





// from shop
const addToWhishlist = async(req,res)=>{
    try {  console.log('salllmman');
        console.log(req.body);
          const{productId,color,price,imageUrl}=req.body
          const uId=req.session.user_id
          console.log(uId+','+productId);
        if(!productId){
            return res.status(400).json({success:false,message:"product id is not found"})
        }
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found "})
        }
        const product = await Product.findById(productId)

       
       const existProduct=await Whishlist.findOne({
            userId: uId,
            productId: productId, 
            productColor: color,
        });
      console.log(existProduct,'ssssssff');
     if(existProduct){
          return res.status(400).json({success:false,message:"product already exist in whishlist"})
        }

       
      
      const newProduct=new Whishlist({
        userId:uId,
        productId:productId,
        productImage:imageUrl,
        productName:product.productName,
        productPrice:price,
        productColor:color,
        
      })
      const whishlistProduct = await newProduct.save()
       console.log(whishlistProduct,'product');
       if(whishlistProduct){
        res.status(201).json({success:true,message:"product added to whishlist successfully"})
       }else{
        res.status(404).json({success:false,message:"product cannot be added to whishlist successfully"})
       }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}

const deleteWhishlistProduct = async(req,res)=>{
    try {   console.log(req.body);
        const productId=req.body.productId

      // Validate the productId
   if (!mongoose.Types.ObjectId.isValid(productId)) {
       return res.status(400).json({ message: 'Invalid product ID' });
   }

   // Convert productId to ObjectId
   const objectId =new mongoose.Types.ObjectId(productId);
       
       const deleteProduct = await Whishlist.findByIdAndDelete(objectId)
   
       if (!deleteProduct) {
        return res.status(404).json({success : false, message: 'product failed to delete' });
    }
    res.status(200).json({success:true, message: 'product deleted successfully' });

        
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadWallet = async(req,res)=>{
    try {   const uId = req.session.user_id
        const page = parseInt(req.query.page) || 1; 
        const limit = 5; 
        const skip = (page - 1) * limit; 



        const wallet = await Wallet.findOne({user:uId})

        if (wallet) {
      
            wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          }

          const totalTransactions = wallet ? wallet.transactions.length : 0;
          
          // Paginate transactions
          const paginatedTransactions = wallet.transactions.slice(skip, skip + limit);
  
          const totalPages = Math.ceil(totalTransactions / limit);

          res.render('wallet',{wallet:wallet,
            transactions: paginatedTransactions,
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





const addMoneyToWallet = async(req,res)=>{
    try {
        const options = {
            amount: Number(req.body.amount) * 100,  
            currency: "INR",
            receipt: "order_receipt_" + Date.now(),
            payment_capture: 1
          };
          const order = await razorpayInstance.orders.create(options);
          res.json(order);
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const verifyWallet = async(req,res)=>{
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
                
    const generatedSignature = crypto
      .createHmac('sha256', process.env.key_secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
  
    if (generatedSignature === razorpay_signature) {
            console.log(generatedSignature,'generated');
            console.log(razorpay_signature,'razpay sgna');
      try {
        const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
        console.log(payment.status,'paymmmennnt');
        if (payment.status === 'captured') {
          
          const userId = req.session.user_id; 
          const amount = payment.amount / 100; 
          await eaddMoneyToWallet(userId, amount);
          res.json({ success: true, message: 'Payment verified and money added to wallet' });
        } else {
          res.status(400).json({ success: false, message: 'Payment not captured' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Error processing payment', error: error.message });
      }
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
}

async function eaddMoneyToWallet(userId, amount) {
    let wallet = await Wallet.findOne({ user: userId });
  
    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: amount,
        transactions: [{
          description: 'Initial deposit',
          amount: amount,
          balance: amount
        }]
      });
    } else {
      const newBalance = Math.ceil(wallet.balance + amount);
      wallet.balance = +newBalance;
      wallet.transactions.push({
        description: 'Deposit via Razorpay',
        amount: amount,
        balance: newBalance
      });
    }
  
    await wallet.save();
  }

  const applyCoupon = async(req,res)=>{
    try { 
         const{code,total} = req.body
         const coupon = await Coupon.findOne({code:code});

        totalAmount = Math.ceil(parseFloat(total.replace(/[^\d.-]/g, '')));
          
        if(!coupon){
            return res.status(400).json({success:false,message:"coupon code not found"})
          }
          if(coupon.minPurchase > totalAmount){
            return res.status(400).json({success:false,message:`you have to purchase atleast ${coupon.minPurchase}`})
          }
        if(coupon.expiryDate< new Date()){
            return res.status(400).json({success:false,message:`coupon has been expired on ${coupon.expiryDate.toLocaleDateString()}`})
        }
        if(coupon.usedCount >= coupon.usageLimit){
            return res.status(400).json({success:false,message:'usage limit of the coupon is exceeded'})
        }
          
       const couponAmount =Math.ceil(totalAmount - (totalAmount * (coupon.discount/100)))
       const discountAmount =Math.ceil(totalAmount-couponAmount)

            
             coupon.usedCount += 1
             coupon.save()

             res.status(200).json({success:true,discountAmount:discountAmount,couponAmount:couponAmount,totalAmount})
          
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
  }
  
  const removeCoupon = async(req,res)=>{
    try {
        const{code,reducedAmount,total} = req.body
        const coupon = await Coupon.findOne({code:code});
      console.log(coupon,'ccccccccc');
       totalAmount = Math.ceil(parseFloat(total.replace(/[^\d.-]/g, '')));
         console.log(totalAmount,'totallll');

         discountAmount = Math.ceil(parseFloat(reducedAmount.replace(/[^\d.-]/g, '')));
   console.log(discountAmount,'dissss');

       if(!coupon){
           return res.status(400).json({success:false,message:"coupon code not found"})
         }

         if(!discountAmount){
            return res.status(400).json({success:false,message:"coupon discount  amount not found"})
          }

          if(!totalAmount){
            return res.status(400).json({success:false,message:"total price  not found"})
          }

          const finalPrice =Math.ceil(totalAmount + Math.abs(discountAmount))
           discountAmount = 0
           coupon.usedCount -= 1
           coupon.save()

           res.status(200).json({success:true,discountAmount:discountAmount,couponAmount:finalPrice})

    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
  }

module.exports={
    downloadOrderPDF,
    loadCheckout,
    placeOrder,
    razorpayOrder,
    handleFailedPayment,
    verifyRazorpay,
    orderRazorpayOrder,
    orderVerifyRazorpay,
    loadOrder,
    loadOrderinfo,
    cancelOrder,
    returnOrder,
    loadWhishlist,
    addToWhishlist,
    deleteWhishlistProduct,
    loadWallet,
    addMoneyToWallet,
    verifyWallet,
    applyCoupon,
    removeCoupon
  }