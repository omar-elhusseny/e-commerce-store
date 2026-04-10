import nodemailer from 'nodemailer';
import logger from './logger.js';

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Send an email
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} text - plain text message
 * @param {string} html - optional HTML message
 */
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = createTransporter();
        const info = await transporter.sendMail({
            from: `"E-Commerce" <${process.env.EMAIL_FROM}>`,
            to,
            subject,
            html,
            text,
        });
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Email send failed to ${to}: ${error.message}`);
        throw error;
    }
};

const emailTemplates = {
    verifyEmail: (name, url) => ({
        subject: 'Verify your email address',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
        <p style="color:#666;font-size:14px;">This link expires in 24 hours.</p>
      </div>`,
        text: `Welcome, ${name}! Verify your email: ${url}`,
    }),

    passwordReset: (name, url) => ({
        subject: 'Reset your password',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${name}, click below to reset your password:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p style="color:#666;font-size:14px;">This link expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>`,
        text: `Reset your password: ${url}`,
    }),

    orderConfirmation: (name, order) => ({
        subject: `Order #${order._id} Confirmed!`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Confirmed 🎉</h2>
        <p>Hi ${name}, your order has been placed successfully!</p>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Total:</strong> ${order.totalPrice?.toFixed(2)}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Payment:</strong> ${order.paymentDetails?.method || 'N/A'}</p>
        <p>We'll notify you when your order ships.</p>
      </div>`,
        text: `Order ${order._id} confirmed. Total: ${order.totalPrice?.toFixed(2)}`,
    }),

    orderStatusUpdate: (name, order) => {
        const statusMessages = {
            processing: 'Your order is being processed.',
            shipped: 'Great news — your order has been shipped!',
            delivered: 'Your order has been delivered. Enjoy!',
            cancelled: 'Your order has been cancelled.',
        };
        const message = statusMessages[order.status] || `Your order status has been updated to: ${order.status}`;
        return {
            subject: `Order #${order._id} — ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`,
            html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Update</h2>
        <p>Hi ${name},</p>
        <p>${message}</p>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total:</strong> ${order.totalPrice?.toFixed(2)}</p>
      </div>`,
            text: `Order ${order._id} update: ${message}`,
        };
    },
};

export { sendEmail, emailTemplates };