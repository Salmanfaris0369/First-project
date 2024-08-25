require('dotenv').config()
const mongoose= require("mongoose")
mongoose.connect('mongodb://127.0.0.1:27017/e-commerce')
.then((result)=>console.log("connectedkk"))
.catch((error)=>console.log(error))

const nocache=require('nocache')


const express=require('express')
const app=express()
app.use((req, res, next) => {
    if (req.originalUrl === '/admin/product/addProduct') {
        return next();
    }
    express.json({ limit: '100mb' })(req, res, next);
});

// Correctly apply the URL-encoded middleware
app.use((req, res, next) => {
    if (req.originalUrl === '/admin/product/addProduct') {
        return next();
    }
    express.urlencoded({ limit: '100mb', extended: true })(req, res, next);
});
app.use(nocache())

const path=require('path')
app.use('/static',express.static(path.join(__dirname,'public')))



//user route
const userRoute=require('./routes/userRoute')
app.use('/',userRoute)

//admin route
const adminRoute=require('./routes/adminRoute')

app.use('/admin',adminRoute)

app.set('view engine','ejs')

app.listen(3000,()=>{
    console.log("server running");
})

