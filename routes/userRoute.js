const express=require('express')
const user_route = express()
const crypto=require('crypto')
const multer=require('multer')
const path=require('path')
const session = require('express-session')
const passport = require('passport')

const config=require('../config/config')
const loginController =require('../controllers/loginController')
const userController=require('../controllers/userController')
const orderController=require('../controllers/orderController')
const userauth = require('../middleware/userauth')

user_route.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        _expires: 86400000,
        httpOnly: true
    }
}));

user_route.set('view engine','ejs')
user_route.set('views','./views/user')


user_route.use(express.json())
user_route.use(express.urlencoded({extended:true}))


user_route.use(express.static('public'))


const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/userimages'))
        },
        filename:function(req,file,cb){
        const name=Date.now()+'-'+file.originalname
        cb(null,name);
        }
})

const upload=multer({storage:storage})


user_route.use(userauth.authMiddleware)
user_route.use(userauth.checkUserStatus)
        
        
user_route.use(passport.initialize());
user_route.use(passport.session());

user_route.get('/',userController.landing)
user_route.get('/register',userauth.isLogout,loginController.loadRegister)

user_route.post('/register',upload.single('image'),loginController.insertUser)



user_route.get('/login',userauth.isLogout,loginController.loginLoad)

user_route.post('/login',loginController.verifyLogin)



user_route.get('/logout',userauth.isLogin,loginController.logout)

user_route.get('/verify',userauth.isLogout,loginController.verifyform)

user_route.post('/verify',loginController.otpVerification)



user_route.post('/resend-otp',loginController.resendOtp)


user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),loginController.googleSuccess)
user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email'],prompt:'select_account'}))

user_route.get('/resetPassword',userauth.isLogout,loginController.resetPasswordPage)
user_route.post('/resetPassword',loginController.emailToken)
user_route.get('/resetPassword/:token',userauth.isLogout,loginController.resetPassword);
user_route.post('/resetPassword/:token',loginController.updatePassword)


user_route.get('/home',userauth.authMiddleware,userController.loadHome)
user_route.get('/shop',userauth.authMiddleware,userController.loadShop)
user_route.post('/shop/add-to-cart',userController.addToCart)
user_route.get('/productinfo/:id',userauth.authMiddleware,userController.loadProductInfo)
user_route.post('/cart/delete',userauth.isLogin,userController.deleteCartProduct)
user_route.post('/increase-cart-quantity', userController.increaseCartQuantity);
user_route.post('/decrease-cart-quantity', userController.decreaseCartQuantity);
user_route.get('/shop/cart/checkout',userauth.isLogin,orderController.loadCheckout)
user_route.post('/placeOrder',orderController.placeOrder)
user_route.get('/orderinfo',userauth.isLogin,orderController.loadOrderinfo)
user_route.post('/orderCancel',orderController.cancelOrder)
user_route.post('/orderReturn',orderController.returnOrder)


// userprofile
user_route.get('/userProfile',userauth.isLogin,userController.loadProfile)
user_route.post('/userProfile/editProfile',userController.editProfile)
user_route.post('/userProfile/changePassword',userController.changePassword)
user_route.get('/userProfile/address',userauth.isLogin,userController.loadAddress)
user_route.post('/userProfile/address',userController.addAddress)
user_route.post('/userProfile/address/delete',userauth.isLogin,userController.deleteAddress)
user_route.post('/userProfile/address/edit',userController.editAddress)
user_route.get('/home/cart',userauth.isLogin,userController.loadCart);
user_route.get('/userProfile/order',userauth.isLogin,orderController.loadOrder)

//coupon
user_route.post('/applyCoupon',orderController.applyCoupon)
user_route.post('/removeCoupon',orderController.removeCoupon)

//whishlist
user_route.get('/home/whishlist',userauth.isLogin,orderController.loadWhishlist)
user_route.post('/shop/add-to-whishlist',orderController.addToWhishlist)
user_route.post('/whishlist/delete',userauth.isLogin,orderController.deleteWhishlistProduct)

//wallet
user_route.get('/userProfile/wallet',userauth.isLogin,orderController.loadWallet)
user_route.post('/create-order',orderController.addMoneyToWallet)
user_route.post('/verify-payment-wallet',orderController.verifyWallet)

//place order in razorpay
user_route.post('/create-razorpay-order',orderController.razorpayOrder)
user_route.post('/handle_failed_payment',orderController.handleFailedPayment)
user_route.post('/verify-payment',orderController.verifyRazorpay)

user_route.post('/order-create-razorpay-order',orderController.orderRazorpayOrder)
user_route.post('/order-verify-payment',orderController.orderVerifyRazorpay)

user_route.get('/order/download-pdf/:orderId', orderController.downloadOrderPDF);

user_route.get('/orderSuccessPage',orderController.loadOrderSuccess)

user_route.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('500', { error: err.message });
});



module.exports = user_route
