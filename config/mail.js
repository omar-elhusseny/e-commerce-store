// utils/mail.js
const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail", // e.g., Gmail, SendGrid, Mailgun
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD, // For Gmail, consider OAuth2 for production
    },
});

// Verify transporter connection (optional, runs once at startup)
transporter.verify((err, success) => {
    if (err) {
        logger.error("Email transporter verification failed", err);
    } else {
        logger.info("✅ Email transporter is ready");
    }
});

/**
 * Send an email
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} text - plain text message
 * @param {string} html - optional HTML message
 */
const sendEmail = async ({ to, subject, text, html }) => {
    const mailOptions = {
        from: process.env.USER_EMAIL,
        to,
        subject,
        text,
        html, // optional
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`📧 Email sent to ${to}: ${info.response}`);
        return info;
    } catch (error) {
        logger.error(`❌ Error sending email to ${to}: ${error.message}`);
        throw new Error("Email could not be sent"); // allow caller to handle
    }
};

module.exports = sendEmail;