const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const config = require('../config/config');

const excelJS = require('exceljs');

// html to pdf generate require things
const ejs = require('ejs');
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');

const securePassword = async(password) => {
    try {
        const secure_password = await bcrypt.hash(password, 10);
        return secure_password;
    } catch (error) {
        console.log(error.message);
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
            html: `<h1>Hello ${name}</h1><p>Please click <a href="http://127.0.0.1:3000/admin/forget-password?token=${token}">here</a> to reset password.</p>`
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

// for sending mail
const addUserMail = async(name, email, password, user_id) => {
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
            subject: 'Admin added your profile, verify your mail',
            html: `<h1>Hello ${name}</h1><p>Please click <a href="http://127.0.0.1:3000/verify?id=${user_id}">here</a> to verify your mail.</p> <br><br> <b>Email:- </b>${email}<br> <b>Password:- </b>${password}`
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

const loadLogin = async(req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.log(error.message);
    }
}

const verifyLogin = async(req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({email:email});
        if(userData){
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if(passwordMatch){
                if(userData.is_admin === 0){
                res.render('login', {message: "Email and Password is incorrect"});
                } else{
                    req.session.user_id = userData._id;
                    res.redirect('/admin/home');
                }
            } else{
                res.render('login', {message: "Email and Password is incorrect"});
            }
        } else{
            res.render('login', {message: "Email and Password is incorrect"});
        }
    } catch (error) {
        console.log(error.message);
    }
}

const loadDashboard = async(req, res) => {
    try {
        const userData = await User.findById({_id:req.session.user_id});
        res.render('home', {admin:userData});
    } catch (error) {
        console.log(error.message);
    }
}

const logout = async(req,res)=>{
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}

const forgetLoad = async(req, res) => {
    try {
        res.render('forget');
    } catch (error) {
        console.log(error.message);
    }
}

const forgetVerify = async(req, res) => {
    try {
        const email = req.body.email;
        const userData = await User.findOne({email:email});
        if(userData){
            if(userData.is_admin === 0){
                res.render('forget', {message: "Email is incorrect"});
            }
            else{
                const randomString = randomstring.generate();
                const updatedData = await User.updateOne({email:email}, {$set:{token:randomString}});
                sendResetPasswordMail(userData.name, userData.email, randomString);
                res.render('forget', {message: "Please check your mail to reset your password."});
            }
        }else{
            res.render('forget', {message: "Email is incorrect"});
        }
    } catch (error) {
        console.log(error.message);
    }
}

const forgetPasswordLoad = async(req, res) => {
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({token:token});
        if(tokenData){
            res.render('forget-password', {user_id:tokenData._id});
        } else{
            res.render('404', {message: "Invalid link"});
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
        const updatedData = await User.findByIdAndUpdate({_id:user_id}, {$set:{password:secure_password, token:''}});
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
    }
}

const adminDashboard = async (req, res) => {
    try {
        var search = '';
        if (req.query.search) {
            search = req.query.search;
        }

        var page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page); // Parse the page query parameter to an integer
        }

        const limit = 2;

        const userData = await User.find({
            is_admin: 0,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            is_admin: 0,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        });

        const totalPages = Math.ceil(count / limit);

        // Calculate the next page only if there are more pages available
        const nextPage = page < totalPages ? page + 1 : null;

        res.render('dashboard', {
            users: userData,
            totalPages: totalPages,
            currentPage: page,
            previous:page-1,
            next: nextPage
        });
    } catch (error) {
        console.log(error.message);
    }
};



// const adminDashboard = async(req, res)=>{
//     try {
//         var search = '';
//         if(req.query.search){
//             search = req.query.search;
//         }

//         var page = 1;
//         if(req.query.page){
//             page = req.query.page;
//         }
//         console.log
//         const limit = 2;
        
//         const userData = await User.find({
//             is_admin:0,
//             $or:[
//                 {name: { $regex:'.*'+search+'.*', $options:'i' }},
//                 {email: { $regex:'.*'+search+'.*', $options:'i' }}
//                 // {mobile: { $regex:'.*'+search+'.*', $options:'i' }}
//             ]
//         })
//         .limit(limit * 1)
//         .skip((page - 1) * limit)
//         .exec();    

//         const count = await User.find({
//             is_admin:0,
//             $or:[
//                 {name: { $regex:'.*'+search+'.*', $options:'i' }},
//                 {email: { $regex:'.*'+search+'.*', $options:'i' }}
//                 // {mobile: { $regex:'.*'+search+'.*', $options:'i' }}
//             ]
//         }).countDocuments();
        
//         res.render('dashboard', {
//             users: userData,
//             totalPages: Math.ceil(count/limit),
//             currentPage: page,
//             // previous: page-1,
//             next: page+1
//         });

//     } catch (error) {
//         console.log(error.message);
//     }
// }

const newUserLoad = async (req,res)=>{
    try {
        res.render('new-user');
    } catch (error) {
        console.log(error.message);
    }
}

const addUser = async (req,res)=>{
    try {
        const name = req.body.name;
        const email = req.body.email;
        const mobile = req.body.mobile;
        const image = req.file.filename;
        const password = randomstring.generate(8);
        const secure_password = await securePassword(password);
        const user = new User({
            name:name,
            email:email,
            mobile:mobile,
            image:image,
            password:secure_password,
            is_admin:0
        })
        const userData = await user.save();
        if(userData){
            addUserMail(name, email, password, userData._id);
            res.redirect('/admin/dashboard');
        } else{
            res.render('new-user', {message:"Something wrong."});
        }
    } catch (error) {
        console.log(error.message);
    }
}

// edit user functionality by admin
const editUserLoad = async (req,res)=>{
    try {
        const id = req.query.id;
        const userData = await User.findById({_id:id});
        if(userData){
        res.render('edit-user', {user:userData});
        } else{
            res.render('/admin/dashboard');
        }
        res.render('edit-user');
    } catch (error) {
        console.log(error.message);
    }
}

const updateUsers = async(req,res)=>{
    try {
        const userData = await User.findByIdAndUpdate({_id:req.body.id}, {$set:{name:req.body.name, email:req.body.email, mobile:req.body.mobile, is_verified:req.body.verify}});
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

const deleteUser = async(req,res)=>{
    try {
        const id = req.query.id;
        await User.deleteOne({_id:id});
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.log(error.message);
    }
}

// export users data into excel file
const exportUsers = async(req,res)=>{
    try {
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("My Users");
        worksheet.columns = [
            { header: 'S no.', key: 's_no'},
            { header: 'Name', key: 'name' },
            { header: 'Email', key: 'email' },
            { header: 'Mobile', key:'mobile' },
            { header: 'Image', key: 'image' },
            { header: 'Is Admin', key: 'is_admin' },
            { header: 'Is Verified', key: 'is_verified' }
        ];

        let counter = 1;
        const userData = await User.find({is_admin:0});
        userData.forEach((user)=>{
            user.s_no = counter;
            worksheet.addRow(user);
            counter++;
        });

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = {bold:true};
        })

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename=users.xlsx`);
        return workbook.xlsx.write(res).then(()=>{
            res.status(200);
        })
    } catch (error) {
        console.log(error.message);
    }
}

// export users data into pdf file 
const exportUsersPdf = async(req,res)=>{ 
    try {
        const users = await User.find({is_admin:0});
        const data = {
            users:users
        }
        const filePathName = path.resolve(__dirname, '../views/admin/htmltopdf.ejs');
        const htmlString = fs.readFileSync(filePathName).toString();
        let options = {
            format: 'A4',
            orientation: 'portrait',
            border: '10mm'
        }
        const ejsData = ejs.render(htmlString, data);
        pdf.create(ejsData,options).toFile('Users.pdf', (err,response)=>{
            if(err) console.log(err);
            
            const filePath = path.resolve(__dirname, '../Users.pdf');
            fs.readFile(filePath, (err,file)=>{
                if(err){
                    console.log(err);
                    return res.status(500).send("could not download file.");
                } else{
                    res.setHeader(
                        "Content-Type",
                        "application/pdf"
                    );
                    res.setHeader("Content-Disposition", `attachment; filename=Users.pdf`);
                    res.send(file);
                }
            })
        });
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    forgetLoad,
    forgetVerify,
    forgetPasswordLoad,
    resetPassword,
    adminDashboard,
    newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser,
    exportUsers,
    exportUsersPdf
}