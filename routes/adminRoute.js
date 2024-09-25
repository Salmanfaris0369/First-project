const express =require('express')
const admin_route = express()
const session = require('express-session')
const config = require('../config/config')
const adminController = require('../controllers/adminController')
const categoryController = require('../controllers/categoryController')
const path = require('path')
const multer=require('multer')
const adminauth=require('../middleware/adminauth')

admin_route.use(session({
    secret: config.adminsessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/admin',
        _expires: 86400000,
        httpOnly: true
    }
}));


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





admin_route.get('/login',adminauth.isLogout,adminController.loadLogin)
admin_route.post('/login',adminController.verifyLogin)
admin_route.get('/logout',adminController.logOut)

admin_route.get('/dashboard',adminauth.isLogin,adminController.getAdminDashboardAnalytics)
// admin_route.get('/dashboard',adminauth.isLogin,adminController.getAdminDashboardAnalytics)
// admin_route.get('/dashboard',adminauth.isLogin,adminController.getAdminDashboardAnalytics)


admin_route.get('/users',adminauth.isLogin,adminController.loadUsers )
admin_route.post('/users/block_unblock/:id',adminController.block_unblock)

admin_route.get('/dashboard/salesReport',adminauth.isLogin,adminController.loadSalesReport)
admin_route.get('/download',adminauth.isLogin,adminController.downloadReport)


//  <--category-->
admin_route.get('/categories',adminauth.isLogin,categoryController.loadCategories)
admin_route.post('/categories/add',categoryController.addCategory)
admin_route.post('/categories/edit',categoryController.editCategory)
admin_route.get('/categoriesRecovery',adminauth.isLogin,categoryController.categoriesRecovery)
admin_route.post('/categoriesRecovery',categoryController.recoverCategory)
admin_route.post('/categories/delete',categoryController.deleteCategory)


//  <--product-->
admin_route.get('/product',adminauth.isLogin,categoryController.loadProduct)
admin_route.get('/product/addProduct',adminauth.isLogin,categoryController.loadAddProduct)
admin_route.post('/product/addProduct',upload.array('images',3),categoryController.addProduct)
admin_route.get('/productRecovery',adminauth.isLogin,categoryController.productRecovery)
admin_route.post('/productRecovery',categoryController.recoverProduct)
admin_route.post('/product/delete',categoryController.deleteProduct)
admin_route.get('/editProduct/:productId',adminauth.isLogin,categoryController.loadEditProduct)
admin_route.post('/product/editProduct', upload.any(),categoryController.editProduct)
admin_route.get('/productDetails',adminauth.isLogin,categoryController.loadProductDetails)


//  <--brands-->
admin_route.get('/brand',adminauth.isLogin,categoryController.loadBrand)
admin_route.post('/brand/add',adminauth.isLogin,categoryController.addBrand)
admin_route.post('/brand/edit',categoryController.editBrand)
admin_route.get('/brandRecovery',adminauth.isLogin,categoryController.brandRecovery)
admin_route.post('/brandRecovery',categoryController.recoverBrand)
admin_route.post('/brand/delete',categoryController.deleteBrand)

//  <--orders-->
admin_route.get('/order',adminController.loadOrder)
admin_route.get('/adminOrderInfo',adminController.loadOaderInfo)
admin_route.post('/statusChange',adminController.statusChange)

//  <--coupons-->
admin_route.get('/coupon',adminauth.isLogin,adminController.loadCoupon)
admin_route.post('/coupon/add',adminController.addCoupon)
admin_route.post('/coupon/edit',adminController.editCoupon)
admin_route.post('/coupon/delete',adminauth.isLogin,adminController.deleteCoupon)

// offers
admin_route.get('/offer',adminauth.isLogin,adminController.loadOffer)
admin_route.post('/offer/add',adminController.addOffer)
admin_route.delete('/offer/delete',adminauth.isLogin,adminController.deleteOffer)
admin_route.post('/offer/edit',adminController.editOffer)


admin_route.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('500', { error: err.message });
});

admin_route.use((req, res, next) => {
    res.status(404).render('404');
});

module.exports=admin_route