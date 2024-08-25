const Product=require('../models/productModel')
const User =require('../models/usermodel')
const brand=require('../models/brandModel')
const category=require('../models/categoryModel')
const bcrypt=require('bcrypt')
const Address=require('../models/addressModel')
const Cart=require('../models/cartModel')
const Order = require('../models/orderModel')
const mongoose = require('mongoose');


const securePassword= async(password)=>{
    try {
      const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}

const loadHome=async(req,res)=>{
    
    console.log(req.session.user_id,'qwert');
    try {   const products = await Product.find({ is_delete: false });
    res.render('home', { products: products });
    
    } catch (error) {
        console.log(error);
    }
}



const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 9;

        const skip = (page - 1) * limit; 

        // Parse filter parameters from the request
    const { brand: brandFilter, category: categoryFilter,priceRange,sort } = req.query;
   console.log(sort);
    const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
         console.log(req.query);
      // Build the filter object
    const filter = { is_delete: false };

    if (brandFilter) {
      filter.productBrand = brandFilter;
    }

    if (categoryFilter) {
      filter.productCategory = categoryFilter;
    }
    if (priceRange) {
        const priceRanges = Array.isArray(priceRange) ? priceRange : [priceRange];
        const priceQueries = priceRanges.map(range => {
            const [min, max] = range.split('-').map(Number);
            if (min && max) {
                return { 'variants.price': { $gte: min, $lte: max } };
            } else if (min) {
                return { 'variants.price': { $gte: min } };
            }
        });

        if (priceQueries.length > 0) {
            filter.$or = priceQueries;
        }
    }


   
      if (search && search !== 'undefined' && search.trim() !== '') {
        filter.productName = { $regex: search.trim(), $options: 'i' };
    }

      let sortOption = {};
      let collation = { locale: 'en', strength: 2 }
      switch (sort) {
        case 'popularity':
          sortOption = { 'variants.orderCount': -1 };
          break;
        case 'price_asc':
          sortOption = { 'variants.price': 1 };
          break;
        case 'price_desc':
          sortOption = { 'variants.price': -1 };
          break;
        case 'rating':
          sortOption = { averageRating: -1 };
          break;
        case 'featured':
          sortOption = { isFeatured: -1 };
          break;
        case 'new_arrivals':
          sortOption = { createdAt: -1 };
          break;
        case 'name_asc':
          sortOption = { productName: 1 };
          collation = { locale: 'en', strength: 2 };
          break;
        case 'name_desc':
          sortOption = { productName: -1 };
          collation = { locale: 'en', strength: 2 };
          break;
        default:
          sortOption = { createdAt: -1 }; 
      }
   
   
   
    const totalProducts = await Product.countDocuments(filter)
        
   

        
        const products = await Product.find(filter).sort(sortOption).collation(collation).populate('variants').skip(skip).limit(limit);

      
        const categories = await category.find({ is_delete: false });
        const brands = await brand.find({ is_delete: false });

        
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('shop', {
            products: products,
            categories: categories,
            brands: brands,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            totalProducts:totalProducts,
            filters: { brandFilter, categoryFilter,search, priceRange: Array.isArray(priceRange) ? priceRange : [priceRange] },
            currentSort: sort || 'new_arrivals'
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred');
    }
};



const loadProductInfo = async (req, res) => {
    try {
        const productId = req.params.id;

        const productinfo = await Product.findById(productId)
            .populate('productCategory')
            .populate('productBrand');

        if (!productinfo) {
            return res.status(404).send("Product not found");
        }

        
        const { 
            productName, 
            productCategory, 
            productBrand, 
            productDescription, 
            productGender, 
            _id, 
            variants, 
            is_delete
        } = productinfo;

//   for related products 
    const products = await Product.find({productBrand:productBrand,productCategory:productCategory})

console.log(products,'eeeeee');


                  // Process variants to include quantity status
        const processedVariants = variants.map(variant => {
            let quantityStatus;
            if (variant.quantity === 0) {
                quantityStatus = 'Out of Stock';
            } else if (variant.quantity < 10) {
                quantityStatus = `${variant.quantity} left`;
            } else {
                quantityStatus = 'In Stock';
            }

            return {
                ...variant.toObject(),
                quantityStatus
            };
        });

        // Create the processed product object
        const productData = {
            productName,
            productCategory,
            productBrand,
            productDescription,
            productGender,
            _id,
            variants: processedVariants,
            is_delete
        };
  console.log(productData);
        res.render('productinfo', { productData: productData,products:products});
    } catch (error) {
        console.error('Error in loadProductInfo:', error);
        res.status(500).send("An error occurred while loading product information");
    }
};


const loadProfile=async(req,res)=>{

    try {  const userId=req.session.user_id
          const currentUser=await User.findById(userId)
           
        console.log(userId+'ssaa');

         res.render('userProfile',{currentUser:currentUser})
        
    } catch (error) {
        console.log(error);
    }
}

const editProfile=async(req,res)=>{
    try {  console.log(req.body);
        const{name,mobile,email,password}=req.body
                   const uID=req.session.user_id

                   const userData=await User.findById(uID)
                   if(!userData){
                    return res.status(404).json({success:false,message:"user not found"})
                   }

          const existUserName=await User.findOne({name:name,_id:{$ne:uID}})
           if(existUserName){
              return res.status(409).json({success:false,message:"user name already exist"})
           }
           
            const passwordMatch=await bcrypt.compare(password,userData.password)
           if(passwordMatch){
    
                 const updateData=await User.findByIdAndUpdate(uID,{$set:{
                    name:name,
                    mobile:mobile,
                    email:email
                 }},{new:true})

          console.log(updateData);
           if(updateData){
             res.status(200).json({success:true,message:"user details updated succesfully"})
           }else{
            res.status(400).json({success:false,message:"user details failed to update"})
           }
        }else{
            res.status(401).json({success:false,message:"Password is incorrect"})
        }
    } catch (error) {
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const changePassword=async(req,res)=>{
    try {  console.log(req.body);
        const{oldpassword,newpassword,conformpassword}=req.body
        const uID=req.session.user_id
        const userData=await User.findById(uID)
        if(!userData){
            return res.status(404).json({success:false,message:"user not found"})
           }
           const passwordMatch=await bcrypt.compare(oldpassword,userData.password)
           if(passwordMatch){
                       const sPassword=await securePassword(newpassword)
    
                 const updateData=await User.findByIdAndUpdate(uID,{$set:{
                    password:sPassword
                 }},{new:true})

          console.log(updateData);
           if(updateData){
             res.status(200).json({success:true,message:"password updated succesfully"})
           }else{
            res.status(400).json({success:false,message:"password failed to update"})
           }
        }else{
            res.status(401).json({success:false,message:"Password is incorrect"})
        }

    } catch (error) {
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadAddress=async(req,res)=>{
    try {   
            const userID=req.session.user_id
            const user=await User.findById(userID)
            const address=await Address.find({user_id:userID})
           res.render('address',{address:address,user:user})
    } catch (error) {
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}
const addAddress=async(req,res)=>{
    try { console.log(req.body);
         const{name,email,mobile,houseNo,street,postOffice,city,district,state,pincode}=req.body

         if (!req.session || !req.session.user_id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        const userId=req.session.user_id
           console.log(userId);

           if (!name || !email || !mobile || !houseNo || !street || !city || !state || !pincode) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const address=new Address({
                user_id:userId,
                addressName:name,
                addressEmail:email,
                addressMobile:mobile,
                addressHouseNo:houseNo,
                addressStreet:street,
                addressPost:postOffice,
                addressCity:city,
                addressDistrict:district,
                addressState:state,
                addressPin:pincode
        })
        console.log(address);
        
        const newAddress = await address.save()
        console.log(newAddress);
     if(newAddress){
        res.status(201).json({success:true,message:"address added successfully"})
     }else{
        res.status(404).json({success:false,message:"address can't add "})
     }

    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}
const deleteAddress = async(req,res)=>{
    console.log(req.body);
    try {  const addressid=req.body.addressId

           const deleteAddress = await Address.findByIdAndDelete(addressid)
           if (!deleteAddress) {
            return res.status(404).json({success : false, message: 'Address not found' });
        }
        res.status(200).json({success:true, message: 'Address deleted successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}
const editAddress= async(req,res)=>{
    try {  
        const{name,email,mobile,houseNo,street,postOffice,city,district,state,pincode,addressID}=req.body

        

        console.log(req.body,'wertyui');
          const userId=req.session.user_id
          console.log(userId);

        if (!req.session || !req.session.user_id) {
           return res.status(401).json({ success: false, message: "User not authenticated" });
       }
       
        if (!name || !email || !mobile || !houseNo || !street || !city || !state || !pincode) {
           return res.status(400).json({ success: false, message: "Missing required fields" });
       }

       const updateAddress=await Address.findByIdAndUpdate(addressID,{$set:{
               user_id:userId,
               addressName:name,
               addressEmail:email,
               addressMobile:mobile,
               addressHouseNo:houseNo,
               addressStreet:street,
               addressPost:postOffice,
               addressCity:city,
               addressDistrict:district,
               addressState:state,
               addressPin:pincode
    }},{new:true})
       console.log(updateAddress);
       
    if(updateAddress){
       res.status(201).json({success:true,message:"address updated successfully"})
    }else{
       res.status(404).json({success:false,message:"address can't updated "})
    }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}

const loadCart=async(req,res)=>{
    try {  const userID=req.session.user_id
        if(!userID){
            return res.status(400).json({success:false,message:"user id not found"})
        }
           const cart=await Cart.find({userId:userID})
         
            res.render('cart',{cart:cart})
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"});
    }
}


// from shop
const addToCart = async(req,res)=>{
    try {  console.log(req.body);
          const{productId,color,quantity,price,imageUrl}=req.body
          const uId=req.session.user_id
          console.log(uId+','+productId);
        if(!productId){
            return res.status(400).json({success:false,message:"product id is not found"})
        }
        if(!uId){
            return res.status(400).json({success:false,message:"user id not found "})
        }
        const product = await Product.findById(productId)

        const variant = product.variants.find(v => v.color === color);
        if (!variant || variant.quantity === 0) {
            return res.status(400).json({ success: false, message: "Product is out of stock" });
        }


       const existProduct=await Cart.findOne({
            userId: uId,
            productId: productId, 
            productColor: color,
        });
      console.log(existProduct);
     if(existProduct){
          return res.status(400).json({success:false,message:"product already exist in cart"})
        }

       
        const cartPrice=price * quantity
        console.log(cartPrice);
      const cProduct=new Cart({
        userId:uId,
        productId:productId,
        productImage:imageUrl,
        productName:product.productName,
        ProductPrice:price,
        productColor:color,
        productQuantity:quantity,
        cartPrice:cartPrice,
      })
      const cartProduct = await cProduct.save()
       console.log(cartProduct);
       if(cartProduct){
        res.status(201).json({success:true,message:"product added to cart successfully"})
       }else{
        res.status(404).json({success:false,message:"product cannot be added to cart successfully"})
       }
    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
}
  const deleteCartProduct = async(req,res)=>{
    try {  console.log(req.body);
             const productId=req.body.productId

           // Validate the productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        // Convert productId to ObjectId
        const objectId =new mongoose.Types.ObjectId(productId);
            
            const deleteProduct = await Cart.findByIdAndDelete(objectId)
        
            if (!deleteProduct) {
             return res.status(404).json({success : false, message: 'product failed to delete' });
         }
         res.status(200).json({success:true, message: 'product deleted successfully' });

    } catch (error) {
        console.log(error)
        res.status(500).json({ success : false, error : "Some error occured"}); 
    }
  }
  const increaseCartQuantity = async (req, res) => {
    try {
        const { cartItemId } = req.body;
        const userId = req.session.user_id;

        // Find the cart item
        const cartItem = await Cart.findOne({ _id: cartItemId, userId: userId });
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Find the product to check available quantity
        const product = await Product.findById(cartItem.productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

    
        const variant = product.variants.find(v => v.color === cartItem.productColor);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Product variant not found" });
        }

 //  new quantity
        let newQuantity = cartItem.productQuantity + 1;

    if (newQuantity > 10) {
            return res.status(400).json({ success: false, message: "Maximum quantity reached" });
        }
   if (newQuantity > variant.quantity) {
            return res.status(400).json({ success: false, message: `Only ${variant.quantity} items available in stock` });
        }

        // Update the cart item
        cartItem.productQuantity = newQuantity;
        cartItem.cartPrice = cartItem.ProductPrice * newQuantity;
        await cartItem.save();
        console.log(cartItem);
        res.status(200).json({ 
            success: true, 
            message: `${product.productName} product quantity increased to ${newQuantity} `,
            newQuantity: newQuantity,
            newTotalPrice: cartItem.cartPrice
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred while updating the cart" });
    }
};

const decreaseCartQuantity = async (req, res) => {
    try {
        const { cartItemId } = req.body;
        const userId = req.session.user_id;

        // Find the cart item
        const cartItem = await Cart.findOne({ _id: cartItemId, userId: userId });
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        // Calculate the new quantity
        let newQuantity = cartItem.productQuantity - 1;

        // Check if new quantity is less than 1
        if (newQuantity < 1) {
            return res.status(400).json({ success: false, message: "Minimum quantity reached" });
        }

        // Update the cart item
        cartItem.productQuantity = newQuantity;
        cartItem.cartPrice = cartItem.ProductPrice * newQuantity;
        await cartItem.save();

        res.status(200).json({ 
            success: true, 
            message: `${cartItem.productName} product quantity decreased to ${newQuantity} `,
            newQuantity: newQuantity,
            newTotalPrice: cartItem.cartPrice
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "An error occurred while updating the cart" });
    }
};
  


module.exports={
loadHome,
loadShop,
loadProductInfo,
loadProfile,
editProfile,
securePassword,
changePassword,
loadAddress,
addAddress,
deleteAddress,
editAddress,
loadCart,
addToCart,
deleteCartProduct,
increaseCartQuantity,
decreaseCartQuantity
}