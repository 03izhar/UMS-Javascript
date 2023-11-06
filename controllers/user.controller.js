const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const randomstring = require('randomstring');

const config = require('../config/config');

const securePassword = async(password) => {
    try {
        const secure_password = await bcrypt.hash(password, 10);
        return secure_password;
    } catch (error) {
        console.log(error.message);
    }
}

// for sending mail
const sendVerifyMail = async(name, email, user_id) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
        });
        const mailOptions = {
            from: config.emailUser,
            to: email,
            subject: 'For Mail Verification',
            html: `<h1>Hello ${name}</h1><p>Please click <a href="http://127.0.0.1:3000/verify?id=${user_id}">here</a> to verify your mail.</p>`
            // html: '<p>Hii '+name+', please click <a href="http://127.0.0.1:3000/verify?id='+user_id+'">here</a> to verify your mail.</p>' 
        };
        transporter.sendMail(mailOptions, function(error,info){
            if(error){
                console.log(error.message);
            } else{
                console.log('Email has been sent:'+ info.response);
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

// for reset password send mail
const sendResetPasswordMail = async(name, email, token) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: config.emailUser,
                pass: config.emailPassword
            }
        });
        const mailOptions = {
            from: config.emailUser,
            to: email,
            subject: 'For Reset Password',
            html: `<h1>Hello ${name}</h1><p>Please click <a href="http://127.0.0.1:3000/forget-password?token=${token}">here</a> to reset password.</p>`
            // html: '<p>Hii '+name+', please click <a href="http://127.0.0.1:3000/verify?id='+user_id+'">here</a> to verify your mail.</p>' 
        };
        transporter.sendMail(mailOptions, function(error,info){
            if(error){
                console.log(error.message);
            } else{
                console.log('Email has been sent:'+ info.response);
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

const loadRegister = async (req, res) => {
    try{
        res.render('registration');

    } catch(error){
        console.log(error.message);
    }
}

const insertUser = async (req, res) => {
    try{
        const passwordHash = await securePassword(req.body.password);
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            image: req.file.filename,
            password: passwordHash,
            is_admin: 0
        })
        const userData = await user.save();

        if(userData){
            sendVerifyMail(req.body.name, req.body.email, userData._id);
            res.render('registration', {message: "Your registration has been successful, Please verify your mail"});
        } else{
            res.render('registration', {message: "Your registration has been failed."});
        }

    } catch(error){
        console.log(error.message);
    }
}

const verifyMail = async(req, res)=>{
    try {
        const updateInfo = await User.updateOne({_id:req.query.id}, {$set: {is_verified:1}});
        console.log(updateInfo);
        res.render("email-verified");
        
    } catch (error) {
        console.log(error.message);
    }
}

// Login user
const loginLoad = async(req, res)=>{
    try {
        res.render("login")
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async(req, res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({email:email});
        if(userData){
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if(passwordMatch){
                if(userData.is_verified === 0){
                    res.render('login', {message: "Please verify your mail first"});
                } 
                else{
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                }
            } 
            else{
            res.render("login", {message: "Email and Password is incorrect."});
            }
        } 
        else{
            res.render("login", {message: "Email and Password is incorrect."});
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadHome = async(req, res)=>{
    try {
        const userData = await User.findById({_id:req.session.user_id});
        res.render('home', {user:userData});
    } catch (error) {
        console.log(error.message);
    }
}

const userLogout = async(req, res)=>{
    try {
        req.session.destroy();
        res.redirect('/');
    } catch (error) {
        console.log(error.message)
    }
}

// forget password Code
const forgetLoad = async(req, res) => {
    try {
        res.render("forget");
    } catch (error) {
        console.log(error.message);
    }
}

const forgetVerify = async(req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){
            if(userData.is_verified === 0){
                res.render('forget', {message: "Please verify your mail first"});
            } else{
                const randomString = randomstring.generate();
                const updatedData = await User.updateOne({email:email}, {$set:{token:randomString}});
                sendResetPasswordMail(userData.name, userData.email, randomString);
                res.render("forget", {message: "Please check your your mail to reset password."});
            }
        } else{
            res.render("forget", {message: "Email is incorrect."});
        }
    } catch (error) {
        console.log(error.message)
    }
}

const forgetPasswordLoad = async(req, res) => {
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({token:token});
        if(tokenData){
            res.render('forget-password', {user_id: tokenData._id});
        } else{
            res.render('404', {message: "Token is invalid"});
        }
    } catch (error) {
        console.log(error.message);
    }
}

const resetPassword = async(req, res) => {
    try {
        const password = req.body.password;
        const user_id = req.body.user_id;

        const secure_password = await securePassword(password);

        const updateData = await User.findByIdAndUpdate({_id:user_id}, {$set:{password:secure_password, token:''}});
        res.redirect("/")
    } catch (error) {
        console.log(error.message)
    }
}

// for verification send mail link
const verificationLoad = async(req, res) => {
    try {
        res.render('verification')
    } catch (error) {
        console.log(error.message)
    }
}

const sendVerificationLink = async (req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){
            sendVerifyMail(userData.name, userData.email, userData._id);
            res.render('verification', {message: "Reset Verification has been sent to your mail."});
        }else{
            res.render('verification', {message: "Email is incorrect."});
        }
    } catch (error) {
        console.log(error.message);
    }
}

// user profile edit and load
const editLoad = async(req, res) => {
    try {
        const id = req.query.id;
        const userData = await User.findById({_id:id});
        if(userData){
            res.render('edit', {user:userData});
        } else{
            res.render('home');
        }
    } catch (error) {
        console.log(error.message)
    }
}

const updateProfile = async (req, res) => {
    try {
        if(req.file){
            const userData = await User.findByIdAndUpdate({_id:req.body.user_id}, {$set: {name:req.body.name, email:req.body.email, mobile:req.body.mobile, image:req.file.filename}});
        } else{
            const userData = await User.findByIdAndUpdate({_id:req.body.user_id}, {$set: {name:req.body.name, email:req.body.email, mobile:req.body.mobile}});
        }
        res.redirect('/home');
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    loadRegister,
    insertUser,
    verifyMail,
    loginLoad,
    verifyLogin,
    loadHome,
    userLogout,
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    verificationLoad,
    sendVerificationLink,
    editLoad,
    updateProfile
}