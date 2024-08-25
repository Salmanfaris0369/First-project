
  const User = require('../models/usermodel')
  const Admin = require('../models/adminmodel')
  const Order = require('../models/orderModel')
  const Address= require('../models/addressModel')
  const Product = require('../models/productModel')
 
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
        console.log(admindata);
        if(admindata){
            const passwordMatch = await bcrypt.compare(password,admindata.adminPassword)
           
                 if(passwordMatch){
                    req.session.admin_id =admindata._id
                        res.redirect('admin/dashboard');
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

const loadDashboard = async(req,res)=>{
    try {
        res.render('dashboard')
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
        console.log(userId,action);

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
        const orders = await Order.find().populate('user');
          res.render('order',{orders : orders})
    } catch (error) {
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadOaderInfo = async(req,res)=>{
    try {  
        console.log(req.query.orderId,'salman');
        
          const orderID=req.query.orderId
          if(!orderID){
             return res.status(400).json({success:false,message:"order id is not found"})
         }
         const order =await Order.findOne({orderId:orderID}).populate('orderItems.product').populate('address').exec();
 
          if (!order) {
             return res.status(404).send('Order not found');
         }
         if (!order.address) {
            // Handle missing address case
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
        const{orderId,itemId,currentStatus} = req.body

        
        console.log(orderId+','+itemId+','+currentStatus,'dddddddddddddd');

        const order = await Order.findOne({orderId:orderId})
        if(!order){
            res.status(400).send({success:false,message:"order id not found"})
           }

           const updateOrder= await Order.findByIdAndUpdate(order._id,{orderStatus:currentStatus},{new:true})
           if(!updateOrder){
            res.status(400).send({success:false,message:"order id not found"})
           }
           const itemIndex = order.orderItems.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(400).send({ success: false, message: "Item not found in order" });
        }
        order.orderItems[itemIndex].itemStatus = currentStatus;

        const allItemsCanceled = order.orderItems.every(item => item.itemStatus === 'Canceled');
          console.log(allItemsCanceled);
        order.orderStatus = allItemsCanceled ? 'Canceled' : currentStatus;

        await order.save();

        res.status(200).send({ success: true, message: "Order and item status updated successfully" });

      } catch (error) {
        console.log(error);
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const logOut = async(req,res)=>{
    try {  console.log(req.session.admin_id);
        req.session.admin_id=null
        res.redirect('/login')
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}


module.exports={
    loadLogin,
    verifyLogin,
    loadDashboard,
    loadUsers,
    block_unblock,
    loadOrder,
    loadOaderInfo,
    statusChange,
    logOut
    
}