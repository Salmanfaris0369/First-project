const Address = require('../models/addressModel')
const Cart = require('../models/cartModel')
const Order = require('../models/orderModel') 
const Product = require('../models/productModel')
const User = require('../models/usermodel')

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
    try {   const uId=req.session.user_id
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found"})
        }
            const address= await Address.find({user_id:uId})
            if(!address){
                return res.status(400).json({success:false,message:"address not found"})
            }
            const cart = await Cart.find({userId:uId})
            if(!cart){
                return res.status(400).json({success:false,message:"cart not found"})
            }
         res.render('checkout',{cart:cart,address:address})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}
const placeOrder=async(req,res)=>{
    try {  
        const{ address,addressId, items, subtotal,total,paymentOption, deliveryDate}=req.body
        const uId=req.session.user_id
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found"})
        }
        
        if(subtotal<1000){
            return res.status(400).json({success:false,message:"More than 1000 rupees need for cash on delivery"})
        }else{   
               const deliAddress= await Address.findById(addressId)
               if(!deliAddress){
                return res.status(400).json({success:false,message:"please provide your address"})
               }
               console.log(deliAddress);
            const uniqueOrderID = await generateUniqueOrderID();

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
                amount :parseFloat(subtotal.replace('₹', '')),
                orderId: uniqueOrderID,
                orderDate:new Date()
              
            })

            await newOrder.save()

          for (let item of items) {
            console.log(item.productId, 'Product ID');
            const product = await Product.findOne({ _id: item.productId });
            console.log(product, 'Product Found');
            
            if (product) {
                console.log(product.variants, 'Variants Array');
                console.log(item.productColor, 'Product Color');
                
                let variantIndex = -1;
                for (let i = 0; i < product.variants.length; i++) {
                    if (product.variants[i].color === item.productColor) {
                        variantIndex = i;
                        break;
                    }
                }
                console.log(variantIndex, 'Variant Index (Manual)');
                
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

        // Update the status of the specific item
        order.orderItems[itemIndex].itemStatus = 'Canceled';

        const allItemsCanceled = order.orderItems.every(item => item.itemStatus === 'Canceled');

        // Update the overall order status if all items are canceled
        if (allItemsCanceled) {
            order.orderStatus = 'Canceled';
        }

        // Save the updated order
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

module.exports={
    loadCheckout,
    placeOrder,
   loadOrder,
   loadOrderinfo,
   cancelOrder
}