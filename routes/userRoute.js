const express=require('express')
const user_route = express()
const crypto=require('crypto')


const config=require('../config/config')
const loginController =require('../controllers/loginController')
const userController=require('../controllers/userController')
const userauth = require('../middleware/userauth')


user_route.set('view engine','ejs')
user_route.set('views','./views/user')


user_route.use(express.json())
user_route.use(express.urlencoded({extended:true}))


const multer=require('multer')
const path=require('path')
const session = require('express-session')
const passport = require('passport')
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


user_route.use(session({
    secret:config.sessionSecret,
    resave:false,
    saveUninitialized:true,
    cookie:{maxAge:6000000}
}))

user_route.use(userauth.checkUserStatus)


user_route.get('/',loginController.loadHome)
user_route.get('/register',userauth.isLogout,loginController.loadRegister)

user_route.post('/register',upload.single('image'),loginController.insertUser)



user_route.get('/login',userauth.isLogout,loginController.loginLoad)

user_route.post('/login',userauth.isLogout,loginController.verifyLogin)



user_route.get('/login',loginController.logout)

user_route.get('/verify',loginController.verifyform)

user_route.post('/verify',loginController.otpVerification)



user_route.post('/resend-otp',loginController.resendOtp)


user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),loginController.googleSuccess)
user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))


user_route.get('/home',userController.loadHome)
user_route.get('/shop',userController.loadShop)
user_route.get('/productinfo/:id',userController.loadProductInfo)


module.exports = user_route