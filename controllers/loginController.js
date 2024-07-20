const { name } = require('ejs');
const User = require('../models/usermodel');
const bcrypt = require('bcrypt')
const nodemailer=require("nodemailer")
const crypto = require('crypto');
const { text } = require('express');
const { error } = require('console');
const passport =require('passport')
const Googlestrategy=require('passport-google-oauth20').Strategy
const session = require('express-session')





const loadRegister = async(req,res)=>{
    try {
        res.render('register')
        
    } catch (error) {
        console.log(error.message);
    }
}

const securePassword= async(password)=>{
    try {
      const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        console.log(error.message);
    }
}


// otp generating 
const generateotp =()=>{
    return crypto.randomInt(100000,999999).toString()
}

const sendOtp=async(email,otp)=>{

    const transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user: process.env.user_email,
            pass: process.env.user_pass
            // ________
        }
    })


const mailOption={
    from:"salmanfs953@gmail.com",
    to:email,
    subject:'OTP',
    text:`your otp is${otp}`
}

 
 
return new Promise((resolve, reject) => {
    transporter.sendMail(mailOption,(error,confirmation)=>{
        if(error){
            reject(error)
        }else{
            resolve('OTP sent to your email')
        }
    })
})

}



const insertUser= async(req,res)=>{
    try {
          
           const existemail= await User.findOne({email:req.body.email})
           if(existemail){
            res.render('register',({message:'Email already exist try different email'}))
           }else{
            const sPassword = await securePassword(req.body.password)
      
      const otp=generateotp()

      req.session.otp=otp;
      req.session.otp_expire=Date.now() + 60000

console.log(req.session.otp_expire);
       req.session.userData={
         name:req.body.name,
        email:req.body.email,
        mobile:req.body.mobile,
        password:sPassword,
        is_blocked:false
    }
        
 await sendOtp(req.body.email,otp)
 res.redirect('/verify')
}
 
    
    } catch (error) {
        console.log(error);
    }
}


const verifyform= async(req,res)=>{
    try {
        if(!req.session.userData){
           return res.redirect('/register')
        }
        else{
            res.render('verify',{message:'please verify your otp'})
        }
    } catch (error) {
        console.log(error.message);
    }
   
}

const otpVerification = async(req,res)=>{
   try{
         const{otp}=req.body
    console.log(req.session.otp_expire);
console.log(req.body.otp);
    
    if(req.session.otp&&req.session.otp_expire>Date.now()&&req.body.otp===req.session.otp){

        const user =req.session.userData;
         const newUser=new User(user);
         const userData = await newUser.save();

        if(userData){
            req.session.otp=null
        req.session.otp_expire=null
        req.session.userData=null

        res.json({ success: true, message: 'Registration successful. You can now login.' })
        }else{
            res.json({ success: false, message: 'Error saving user data.' });
        }

    }else{
        res.json({ success: false, message: 'Invalid or expired OTP.' })
    }
}catch{
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}




const resendOtp = async(req,res)=>{
    try {   
            const userData =req.session.userData
            console.log(userData);
           if(!userData){
            return res.status(400).json({success:false,message:'session not found'})
           }


           const newOtp=generateotp()
           console.log(newOtp);
          req.session.otp=newOtp
          req.session.otp_expire = Date.now() + 60000
           await sendOtp(userData.email,newOtp)
           res.json({ success: true, message: 'OTP resent successfully' })
        
    } catch (error) {
        console.error();(error.message);
        res.status(500).json({ success: false, message: 'Server error' })
    }
}


// user login 

const loginLoad = async(req,res)=>{
    try {
        res.render('login')
    } catch (error) {
    console.log(error.message);        
    }
}




const verifyLogin = async(req,res)=>{

  try {  req.session.user_id=req.body.user_id
          const email=req.body.email
          const password = req.body.password

       const userData= await User.findOne({email:email})

       if(userData){
               const passwordMatch=await bcrypt.compare(password,userData.password)
               if(passwordMatch){
                       if(userData.is_blocked==true){
                        
                        res.render('login',{message:"You are blocked"})
                       }else{
                        // req.session.user_id=userData._id
                        console.log(req.session.user_id,'sdfghj');
                        res.redirect('/home')
                       }
               }else{
                res.render('login',{message:"password is incorrect"})
               }
       }else{
        res.render('login',{message:"user not found"})
       }


  } catch (error) {
    console.log(error.message);
  }

}

const loadHome = async(req,res)=>{
    try {
        res.render('home')
    } catch (error) {
       console.log(error.message); 
    }
}

const logout = async(req,res)=>{
    try { console.log(req.session.user_id);
        req.session.user_id=null
        res.redirect('/login')
    } catch (error) {
        console.log(error.message);
    }
}

// login with google

passport.use(new Googlestrategy({
    clientID:process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL:process.env.callbackURL,
    passReqToCallback:true
},async(req,accessToken,refreshToken,profile,done)=>{
  try{    
         let user=await User.findOne({email:profile.emails[0].value})


    if(!user){
             user=new User({
                googleId:profile._id,
                name:profile.displayName,
                email:profile.emails[0].value,
                image:profile.photos[0].value
             });
             await user.save()
       }

       return done(null,profile)
     
    }catch(error){
        console.log(error);
    }
}));

passport.serializeUser((user,done)=>{
       done(null,user.id)
})


passport.deserializeUser(async(id,done)=>{
    try {
        const user=await User.findById(id)
        done(null,user)
    } catch (error) {
        done (error)
    }
})

const googleSuccess = async(req,res,next)=>{
    try {
        if(!req.user){
            return res.redirect('/login')
        }
        if(req.user.is_blocked==1){
            return res.render('login',{message:'user is blocked'})
        }
       req.session.user_id=req.user._id
           res.redirect('/home')
    } catch (error) {
        console.log(error);
    }
}




module.exports={
    loadRegister,
    insertUser,
    securePassword,
    loginLoad,
    verifyLogin,
    loadHome,
    logout,
    verifyform,
    otpVerification,
    resendOtp,
    googleSuccess
    
}