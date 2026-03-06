const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or any other service like 'smtp.mailtrap.io' or 'SendGrid'
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD
    }
});

const sendEmail = (email, emailSubject, message) => {
    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: email,
        subject: emailSubject,
        text: message
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("error from sendMail", error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

module.exports = sendEmail;