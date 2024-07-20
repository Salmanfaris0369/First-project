const Product=require('../models/productModel')
const User =require('../models/usermodel')
const brand=require('../models/brandModel')
const category=require('../models/categoryModel')



const loadHome=async(req,res)=>{
    
    console.log(req.session.User_id,'qwert');
    try {   const products = await Product.find({ is_delete: false });
    res.render('home', { products: products });
    
    } catch (error) {
        console.log(error);
    }
}

const loadShop=async(req,res)=>{
    try {     const products = await Product.find({ is_delete: false }).populate('variants');
              const categories=await category.find({is_delete:false})
              const brands=await brand.find({is_delete:false})
        res.render('shop',{products: products,categories:categories,brands:brands})
    } catch (error) {
        console.log(error);
    }
}
const loadProductInfo=async(req,res)=>{
    try {
             const productid=req.params.id
console.log(productid);
             const productData=await Product.findById(productid).populate('productCategory').populate('productBrand')
             if (!productData) {
                return res.status(404).send("Product not found");
            }

            const { productName, productCategory, productBrand, productDescription,productGender,_id,variants,is_delete} = productData
            const products={ productName, productCategory, productBrand, productDescription,productGender,_id,variants,is_delete}
            res.render('productinfo',{productData:productData})
    } catch (error) {
        console.log(error)
    }
}



module.exports={
loadHome,
loadShop,
loadProductInfo
}