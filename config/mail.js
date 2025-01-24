
const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey("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"); // Your actual API key here

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
    // sgMail.send({
    //     to: email,
    //     from: 'omarelhusseny.63@gmail.com', // Use a verified sender email
    //     subject: emailSubject,
    //     html: `<h1>${message}</h1>`,
    // });
};

module.exports = sendEmail;