const categories = require('../models/categoryModel');
const product = require('../models/productModel')
const Category = require('../models/categoryModel')
const brand = require('../models/brandModel')
const fs = require('fs').promises;
const path = require('path');


const loadProduct=async(req,res)=>{
    try {
        const products=await product.find({is_delete:false}) .populate('productCategory', 'categoryName').populate('productBrand', 'brandName') 
        res.render('product',{product:products})
        
    } catch (error) {
         console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const loadAddProduct=async(req,res)=>{
    try {
          const brands=await brand.find()
          const categories=await Category.find()
        res.render('addProduct',{categories:categories,brands:brands})
        
    } catch (error) {
         console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const addProduct= async(req,res)=>{
    try {  
        
    const { productName, productCategory, productBrand, productDescription,productGender} = req.body

    if (!productName||!productCategory||!productBrand||!productDescription||!productGender) {
        return res.status(400).json({ message: 'All fields not provided completely' });
    }
    let variantData;
        try {
            variantData = JSON.parse(req.body.variantData);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid variant data' });
        }

        if (!variantData || !variantData.color || !variantData.price || !variantData.quantity) {
            return res.status(400).json({ message: 'Variant data is incomplete' });
        }

        const imageFilenames = req.files ? req.files.map(file => file.filename) : [];
        const discountPrice = variantData.price

            const newProduct = new product({
            productName:productName,
            productCategory:productCategory,
            productBrand: productBrand,
            productDescription: productDescription,
            productGender:productGender,
            discountPrice:discountPrice,
            variants: [{
            color: variantData.color,
            images: imageFilenames,
            price: variantData.price,
            quantity:variantData.quantity
            }]
        })
        
        const addedProduct=await newProduct.save();
        res.status(201).json({message:'product added',addedProduct})
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}
const loadEditProduct=async(req,res)=>{
    try {  const id=req.params.productId
     
            const productData=await product.findById({_id:id})
            const brands=await brand.find()
            const categories=await Category.find()
            
            if(productData){
                res.render('editProduct',{product:productData,brands:brands,categories:categories})
            }else{
                res.redirect('/product')
            }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message })
    }
}

const editProduct = async (req, res) => {
    try {  
        const { productName, productCategory, productBrand, productGender, productDescription, variants } = req.body;
                  
             
       
        const Product = await product.findById(req.body.productId); 
       
    
        if (!Product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
        }
        Product.productName = productName;
        Product.productCategory = productCategory;
        Product.productBrand = productBrand;
        Product.productGender = productGender;
        Product.productDescription = productDescription;

        if(!Product.productOffer){
            const discountPrice = variants[0].price
            Product.discountPrice=discountPrice
        }
    
        if (Product.variants.length > 0) {
          Product.variants[0].color = variants[0].color;
          Product.variants[0].price = variants[0].price;
          Product.variants[0].quantity = variants[0].quantity;

          // Handle images
          const newImages = req.files.map(file => file.filename);
          const existingImages = variants[0].existingImages || []; // Filter out new images
         
          // Remove images that are not in existingImages
          const imagesToRemove = Product.variants[0].images.filter(img => !existingImages.includes(img));
         
          for (const img of imagesToRemove) {
            await fs.unlink(path.join('public/productImages/', img));
          }
          Product.variants[0].images = [...existingImages, ...newImages];
        } else {
        
          Product.variants[0].push({
            color: variants[0].color,
            price: variants[0].price,
            quantity: variants[0].quantity,
            images: req.files.map(file => file.filename)
          });
        }
    
        await Product.save();
        console.log(Product,'pppprrrr');
    
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
    }
};


const loadProductDetails = async(req,res)=>{
    try { 
             const productID=req.query.productId
             if(!productID){
                return res.status(400).json({success:false,message:"product id is not found"})
            }
            const productData =await product.findOne({_id:productID}).populate('productCategory', 'categoryName').populate('productBrand', 'brandName')
               
             if (!productData) {
                return res.status(404).send('product not found');
            }

           res.render('productDetails',{productData});

     } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Error in getting  product details', error: error.message });
    }
}



const loadBrand= async(req,res)=>{
    try {
        const brands=await brand.find({is_delete:false})
        res.render('brand',{brands:brands})
        
    } catch (error) {
        console.log(error);
    }
}
const productRecovery=async(req,res)=>{
    try {  
        const products=await product.find({is_delete:true}).populate('productCategory', 'categoryName').populate('productBrand', 'brandName') 
        res.render('productRecovery',{products:products})

        } catch (error) {
        console.error("Error recover product:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const recoverProduct=async(req,res)=>{
    try {  
          const{productId}=req.body
          const recoverData=await product.findByIdAndUpdate(req.body.productId,{is_delete:false},{new:true})

          if(!recoverData){
            return res.status(400).json({message:" no product found"})
          }
          res.status(200).json({success:true, message: "product recovered successfully" });

        
    } catch (error) {
        console.error("Error recover cbrand:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}
const deleteProduct=async(req,res)=>{
    try { 
     const{productId}=req.body
    
    if(!productId){
        return res.status(400).json({success:false,message:"product required"})
    }
       const updateProduct = await product.findByIdAndUpdate(req.body.productId, { is_delete: true }, { new: true });
       
        if (updateProduct) {
          res.json({
            success: true,
            message: 'product successfully marked as deleted',
            redirectUrl: '/admin/productRecovery'
          });
        } 

   } catch (error) {
        console.error("Error recover brand:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}


const brandRecovery=async(req,res)=>{
    try {  
        const brands=await brand.find({is_delete:true})
        res.render('brandRecovery',{brands:brands})

          } catch (error) {
        console.error("Error recover category:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const recoverBrand=async(req,res)=>{
    try { 
        const{brandId}=req.body
        const recoverData=await brand.findByIdAndUpdate(req.body.brandId,{is_delete:false},{new:true})
          if(!recoverData){
            return res.status(400).json({message:" no brand found"})
          }
          res.status(200).json({success:true, message: "brand recovered successfully" });

        
    } catch (error) {
        console.error("Error recover cbrand:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const addBrand= async(req,res)=>{
    try {   
       
        const {brandName}=req.body
      
        if(!brandName){
            return res.status(400).json({success:false,message:"brand required"})
        }
        
        const existbrand=await brand.findOne({brandName}).collation({locale:'en',strength:2})
        if(existbrand){
            return res.redirect('/brand').status(400).json({success:false,message:"brand already exist"})
        }
        const newbrand = new brand({
            brandName : brandName,
            is_delete:false
        });
   
        const brandData = await newbrand.save()
        res.status(200).json({success:true,message:'brand added',brandData})
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


const editBrand =async(req,res)=>{
    try {  
        const{brandName,brandId} =req.body

     if(!brandName){
        return res.status(400).json({message:"brand required"})
    }
    
    const existbrand=await brand.findOne({brandName}).collation({locale:'en',strength:2})
    if(existbrand){
        return res.redirect('/brand').status(409).json({message:"brand already exist"})
    }

  const updateData = await brand.findByIdAndUpdate(req.body.brandId,{brandName:req.body.brandName},{new:true})
   
  res.status(200).json({ message: "brand edited successfully" });

 } catch (error) {                                              
    console.error("Error updating brand:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const deleteBrand=async(req,res)=>{
    try {  const{brandId}=req.body
   
    if(!brandId){
        return res.status(400).json({success:false,message:"brand required"})
    }
       const updatebrand = await brand.findByIdAndUpdate(req.body.brandId, { is_delete: true }, { new: true });
     
        if (updatebrand) {
          res.json({
            success: true,
            message: 'brand successfully marked as deleted',
            redirectUrl: '/admin/brandRecovery'
          });
        } 

   } catch (error) {
        console.error("Error recover brand:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}


const loadCategories= async(req,res)=>{
    try {
        const category=await categories.find({is_delete:false})
        res.render('categories',{category:category})
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const addCategory= async(req,res)=>{
    try {   
       const {categoryName}=req.body

        if(!categoryName){
            return res.status(400).json({message:"category required"})
        }
        
        const existCategory=await categories.findOne({categoryName}).collation({locale:'en',strength:2})
        if(existCategory){
            return res.status(409).json({message:"category already exist"})
        }
        const newcategory = new categories({
            categoryName : categoryName,
            is_delete:false
        });
      
        const categoryData = await newcategory.save()
        res.status(200).json({message:'category added',categoryData})
        
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}


const editCategory =async(req,res)=>{
    try {  
        const{categoryName,categoryId} =req.body

    if(!categoryName){
        return res.status(400).json({message:"category required"})
    }
    
    const existCategory=await categories.findOne({categoryName}).collation({locale:'en',strength:2})
    if(existCategory){
        return res.redirect('/categories').status(409).json({message:"category already exist"})
    }

  const updateData = await categories.findByIdAndUpdate(req.body.categoryId,{categoryName:req.body.categoryName},{new:true})
   
  res.status(200).json({ message: "Category edited successfully" });

 } catch (error) {                                              
    console.error("Error updating category:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const categoriesRecovery=async(req,res)=>{
    try {  
        const category=await categories.find({is_delete:true})
        res.render('categoriesRecovery',{category:category})

         } catch (error) {
        console.error("Error recover category:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const deleteCategory=async(req,res)=>{
    try { 
     const{categoryId}=req.body
    if(!categoryId){
        return res.status(400).json({success:false,message:"category required"})
    }
       const category = await categories.findByIdAndUpdate(req.body.categoryId, { is_delete: true }, { new: true });

        if (category) {
          res.json({
            success: true,
            message: 'Category successfully marked as deleted',
            redirectUrl: '/admin/categoriesRecovery'
          });
        } 

   } catch (error) {
        console.error("Error recover category:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

const recoverCategory=async(req,res)=>{
    try {  
        const{categoryId}=req.body
         const recoverData=await categories.findByIdAndUpdate(req.body.categoryId,{is_delete:false},{new:true})
          if(!recoverData){
            return res.status(400).json({message:" no category found"})
          }
          res.status(200).json({success:true, message: "Category recovered successfully" });

        
    } catch (error) {
        console.error("Error recover category:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

module.exports ={
    loadCategories,
    addCategory,
    editCategory,
    deleteCategory,
    recoverCategory,
    categoriesRecovery,
    loadProduct,
    loadAddProduct,
    addProduct,
    loadBrand,
    brandRecovery,
    recoverBrand,
    addBrand,
    editBrand,
    deleteBrand,
    productRecovery,
    recoverProduct,
    deleteProduct,
    loadEditProduct,
    editProduct,
    loadProductDetails
}