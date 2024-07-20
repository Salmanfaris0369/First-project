const express =require('express')
const admin_route = express()
const session = require('express-session')
const config = require('../config/config')
const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const path = require('path')
const multer=require('multer')
const adminauth=require('../middleware/adminauth')


admin_route.use(express.json())
admin_route.use(express.urlencoded({extended:true}))

admin_route.set('view engine','ejs');
admin_route.set('views','views/admin');


admin_route.use(express.static('public'))

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/productimages'))
    },
    filename:function(req,file,cb){
        const name=Date.now()+'-'+file.originalname
        cb(null,name);
    }
})

const upload=multer({storage:storage,limits: { fileSize: 50 * 1024 * 1024 }})



admin_route.use(session({
    secret:config.sessionSecret,
    resave:false,
    saveUninitialized:true,
    cookie:{
     _expires:60000,
    path:'/admin',
    httpOnly:true
                }
}))


admin_route.get('/login',adminController.loadLogin)
admin_route.post('/login',adminController.verifyLogin)


admin_route.get('/dashboard',adminController.loadDashboard)
admin_route.get('/admin/dashboard',adminauth.isAdmin,adminController.loadDashboard)


admin_route.get('/users',adminController.loadUsers )
admin_route.post('/users/block_unblock/:id',adminController.block_unblock)


//  <--category-->
admin_route.get('/categories',categoryController.loadCategories)
admin_route.post('/categories/add',categoryController.addCategory)
admin_route.post('/categories/edit',categoryController.editCategory)
admin_route.get('/categoriesRecovery',categoryController.categoriesRecovery)
admin_route.post('/categoriesRecovery',categoryController.recoverCategory)
admin_route.post('/categories/delete',categoryController.deleteCategory)


//  <--product-->
admin_route.get('/product',categoryController.loadProduct)
admin_route.get('/product/addProduct',categoryController.loadAddProduct)
admin_route.post('/product/addProduct',upload.array('images',3),categoryController.addProduct)
admin_route.get('/productRecovery',categoryController.productRecovery)
admin_route.post('/productRecovery',categoryController.recoverProduct)
admin_route.post('/product/delete',categoryController.deleteProduct)
admin_route.get('/editProduct/:productId',categoryController.loadEditProduct)
admin_route.post('/product/editProduct',categoryController.editProduct)


//  <--brands-->
admin_route.get('/brand',categoryController.loadBrand)
admin_route.post('/brand/add',categoryController.addBrand)
admin_route.post('/brand/edit',categoryController.editBrand)
admin_route.get('/brandRecovery',categoryController.brandRecovery)
admin_route.post('/brandRecovery',categoryController.recoverBrand)
admin_route.post('/brand/delete',categoryController.deleteBrand)

module.exports=admin_route