/**
 * Mail Utility Functions
 * Handles all email sending operations
 */

const https = require('https');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'https://email-service-delta-seven.vercel.app/api/send-email';

// Keep-Alive HTTPS agent to reuse SSL sockets across microservice calls
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    keepAliveMsecs: 30000
});

const httpClient = axios.create({
    httpsAgent,
    timeout: 8000
});

// Initialize Gmail SMTP transporter with pooled connection
let smtpTransporter = null;
let isSmtpVerified = null; // null = pending check, true = verified working, false = blocked/failed

if (process.env.EMAIL && process.env.EMAIL_PASSWORD) {
    smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        rateLimit: 5,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD.replace(/\s+/g, '')
        },
        connectionTimeout: 3500,
        greetingTimeout: 2500,
        socketTimeout: 5000
    });

    // Proactively verify SMTP on startup. If outbound 587/465 is blocked (e.g. Render free tier),
    // mark false immediately so subsequent requests route straight to the HTTP microservice without delay.
    smtpTransporter.verify((err) => {
        if (err) {
            console.warn(`[Mail] Direct SMTP check unverified (port blocked or invalid credentials): ${err.message}. Defaulting to HTTP microservice.`);
            isSmtpVerified = false;
        } else {
            console.log('[Mail] Direct SMTP connection pool verified & active.');
            isSmtpVerified = true;
        }
    });
}

const sendViaSmtp = async ({ to, subject, html, text, fromAddress }) => {
    if (!smtpTransporter) {
        throw new Error('SMTP transporter not initialized');
    }
    const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || undefined
    });
    console.log(`[Mail SMTP Success] Delivered to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
};

const sendViaHttp = async ({ to, subject, html, sender }) => {
    if (!process.env.EMAIL_SERVICE_API) {
        throw new Error('EMAIL_SERVICE_API not configured');
    }
    const response = await httpClient.post(emailServiceUrl, {
        from: sender,
        to,
        subject,
        html
    }, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EMAIL_SERVICE_API}`
        }
    });
    console.log(`[Mail HTTP Success] Delivered to ${to}`);
    return { success: true, data: response.data };
};

const sendMail = async ({ to, subject, html, text }) => {
    const sender = process.env.EMAIL || 'triptual.support@gmail.com';
    const fromAddress = `"GroupTrip Ledger" <${sender}>`;

    // 1. If SMTP is verified or pending first check, use fast pooled direct SMTP (~1.2-1.5s)
    if (smtpTransporter && isSmtpVerified !== false) {
        try {
            return await sendViaSmtp({ to, subject, html, text, fromAddress });
        } catch (smtpErr) {
            console.warn(`[Mail SMTP Error] Failed via SMTP: ${smtpErr.message}. Falling back to HTTP microservice.`);
            isSmtpVerified = false; // Mark failed to prevent subsequent timeouts
        }
    }

    // 2. HTTP Microservice with Keep-Alive connection
    if (process.env.EMAIL_SERVICE_API) {
        try {
            return await sendViaHttp({ to, subject, html, sender });
        } catch (httpErr) {
            console.warn(`[Mail HTTP Error] Failed via HTTP service: ${httpErr.message}`);
            // If SMTP was never attempted (isSmtpVerified was false), try SMTP as last resort
            if (smtpTransporter && isSmtpVerified === false) {
                try {
                    return await sendViaSmtp({ to, subject, html, text, fromAddress });
                } catch (lastSmtpErr) {
                    console.warn(`[Mail Final SMTP Error] ${lastSmtpErr.message}`);
                }
            }
            throw httpErr;
        }
    }

    // 3. Fallback to direct SMTP if HTTP service API is not configured
    if (smtpTransporter) {
        return await sendViaSmtp({ to, subject, html, text, fromAddress });
    }

    throw new Error('Neither working direct SMTP nor EMAIL_SERVICE_API available');
};

/**
 * Send OTP Email
 * @param {string} emailId - Recipient email address
 * @param {number} otp - One Time Password
 * @param {string} username - User's name
 * @param {string} purpose - Purpose of OTP (e.g., "Password Reset", "Email Verification")
 */
const sendOTPEmail = async (emailId, otp, username, purpose = "Verification") => {
    try {
        await sendMail({
            to: emailId,
            subject: `Your OTP for ${purpose}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #ddd;">
                    <div style="text-align: center; background-color: #030711; padding: 15px; border-radius: 8px 8px 0 0;">
                        <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Aug%2024%2C%202026%2C%2011_11_38%20PM-G7W8fRrfMM3iBOkWdjTTdkKmT4nXVX.png" alt="Triptual Logo" style="max-width: 80px;">
                        <h2 style="color: #ffffff; margin: 10px 0;">OTP Verification</h2>
                    </div>
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="font-size: 16px;">Dear <strong>${username}</strong>,</p>
                        <p>Your OTP for <strong>${purpose}</strong> is:</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 10px; text-align: center;">
                            <h2 style="color: #030711; font-size: 24px; margin: 0;">${otp}</h2>
                            <p style="margin-top: 5px; color: red;">This OTP expires in 5 minutes.</p>
                        </div>
                        <p style="text-align: center; color: gray; font-size: 12px; margin-top: 20px;">
                            If you did not request this OTP, please ignore this email.<br>
                            Thank you, <br>Triptual Team
                        </p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color:gray; font-size:12px; text-align: center;">This is an autogenerated message. Please do not reply to this email.</p>
                </div>
            `,
            text: `Dear ${username},\n\nYour OTP for ${purpose} is: ${otp}\n\nThis OTP expires in 5 minutes.`
        });
        return { success: true, message: "Email sent successfully" };
    } catch (error) {
        console.error("Mail Error:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Send Official Group Invitation Email (Unstop-style)
 */
/**
 * Helper to format clean, compact date ranges for mobile emails
 */
function formatTripDates(startDate, endDate) {
    if (!startDate && !endDate) return 'Dates to be decided';
    const parseDate = (d) => {
        if (!d) return null;
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
            const [y, m, day] = d.trim().split('-').map(Number);
            return { month: m - 1, day, year: y };
        }
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return null;
        return { month: parsed.getMonth(), day: parsed.getDate(), year: parsed.getFullYear() };
    };

    const s = parseDate(startDate);
    const e = parseDate(endDate);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (s && e) {
        const sMonth = months[s.month];
        const eMonth = months[e.month];
        if (s.year === e.year && s.month === e.month) {
            return s.day === e.day ? `${sMonth} ${s.day}, ${s.year}` : `${sMonth} ${s.day}–${e.day}, ${s.year}`;
        }
        if (s.year === e.year) {
            return `${sMonth} ${s.day} – ${eMonth} ${e.day}, ${s.year}`;
        }
        return `${sMonth} ${s.day}, ${s.year} – ${eMonth} ${e.day}, ${e.year}`;
    }
    if (s) {
        return `From ${months[s.month]} ${s.day}, ${s.year}`;
    }
    return 'Dates to be decided';
}

/**
 * Send Official Group Invitation Email (Unstop-style, mobile-optimized)
 */
const sendOfficialInviteEmail = async ({
    recipientEmail,
    recipientName,
    inviterName,
    groupName,
    destination,
    startDate,
    endDate,
    tripType,
    expenseSplit,
    currency,
    inviteUrl,
    inviteCode
}) => {
    const liveDomain = (process.env.APP_URL || process.env.FRONTEND_URL || 'https://hack-celestial-one.vercel.app').trim().replace(/\/+$/, '');
    const cleanInviteUrl = (inviteUrl || `${liveDomain}/join/${inviteCode || ''}`)
        .replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, liveDomain)
        .replace(/^capacitor:\/\/localhost/i, liveDomain);

    const formattedDates = formatTripDates(startDate, endDate);

    const htmlContent = `
        <div style="margin: 0; padding: 12px 6px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
            <div style="max-width: 440px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
                
                <!-- Compact Brand Header -->
                <div style="text-align: center; padding: 16px 14px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff;">
                    <div style="font-size: 20px; line-height: 1; margin-bottom: 4px;">✈️</div>
                    <h1 style="margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #ffffff;">Trip Team Invitation</h1>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #d1fae5; font-weight: 500;">GroupTrip Ledger & Expense Hub</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 18px 16px;">
                    <p style="font-size: 13.5px; line-height: 1.4; margin: 0 0 8px 0; color: #0f172a;">
                        Hi <strong>${recipientName || 'there'}</strong>,
                    </p>
                    <p style="font-size: 12.5px; line-height: 1.5; color: #334155; margin: 0 0 12px 0;">
                        <strong>${inviterName || 'Your friend'}</strong> invited you to join <strong style="color: #059669;">"${groupName}"</strong>.
                    </p>

                    <!-- Status Pill (Centered) -->
                    <div style="text-align: center; margin: 0 0 14px 0;">
                        <div style="display: inline-block; padding: 4px 10px; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #c2410c;">
                            📩 Invite Pending • Approval Required
                        </div>
                    </div>

                    <!-- Clean Trip Overview Box (Mobile 2-Column Key-Value) -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px;">
                        <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;">
                            TRIP OVERVIEW
                        </div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; font-size: 12px;">
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 88px; white-space: nowrap; vertical-align: middle;">📍 Destination</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; vertical-align: middle;">${destination}</td>
                            </tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 88px; white-space: nowrap; vertical-align: middle;">📅 Dates</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; vertical-align: middle;">${formattedDates}</td>
                            </tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 88px; white-space: nowrap; vertical-align: middle;">🏷️ Trip Type</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; vertical-align: middle;">${tripType || 'Friends'}</td>
                            </tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 88px; white-space: nowrap; vertical-align: middle;">💳 Split</td>
                                <td style="padding: 6px 0; color: #059669; font-weight: 700; text-align: right; vertical-align: middle;">${expenseSplit || 'Equal'} (${currency || 'INR'})</td>
                            </tr>
                            <tr><td colspan="2" style="border-bottom: 1px solid #f1f5f9; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748b; width: 88px; white-space: nowrap; vertical-align: middle;">🔑 Invite Code</td>
                                <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace; text-align: right; vertical-align: middle; font-size: 11.5px;">${inviteCode}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Call to Action Button -->
                    <div style="text-align: center; margin: 16px 0 10px 0;">
                        <a href="${cleanInviteUrl}" style="background-color: #059669; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 3px 10px rgba(5, 150, 105, 0.3);">
                            Review & Accept Invitation →
                        </a>
                    </div>

                    <p style="font-size: 11px; color: #64748b; text-align: center; line-height: 1.4; margin: 0 0 12px 0;">
                        <em>Note: You will join the group roster and shared ledger only after you click and approve.</em>
                    </p>

                    <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 12px 0;">

                    <p style="font-size: 10.5px; color: #94a3b8; word-break: break-all; margin: 0; text-align: center; line-height: 1.4;">
                        Or open this link directly in your browser:<br>
                        <a href="${cleanInviteUrl}" style="color: #059669; font-weight: 500; text-decoration: underline;">${cleanInviteUrl}</a>
                    </p>
                </div>

                <!-- Footer -->
                <div style="text-align: center; padding: 10px 14px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #94a3b8;">
                    <p style="margin: 0;">Official invite sent to ${recipientEmail}</p>
                </div>
            </div>
        </div>
    `;

    try {
        await sendMail({
            to: recipientEmail,
            subject: `Official Invitation: Join "${groupName}" on GroupTrip Ledger`,
            html: htmlContent
        });
        return { success: true };
    } catch (err) {
        console.warn(`Could not dispatch invite email to ${recipientEmail}:`, err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send Generic Email
 */
const sendEmail = async (emailId, subject, htmlContent) => {
    try {
        await sendMail({
            to: emailId,
            subject,
            html: htmlContent
        });
        return { success: true, message: "Email sent successfully" };
    } catch (error) {
        console.warn("Mail Error:", error.response?.data || error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Send Welcome Email upon direct registration
 */
const sendWelcomeEmail = async (emailId, username) => {
    try {
        await sendMail({
            to: emailId,
            subject: 'Welcome to GroupTrip Ledger!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #ddd;">
                    <div style="text-align: center; background-color: #030711; padding: 15px; border-radius: 8px 8px 0 0;">
                        <h2 style="color: #ffffff; margin: 10px 0;">Welcome to GroupTrip Ledger!</h2>
                    </div>
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px;">Hi <strong>${username}</strong>,</p>
                        <p>Your account has been successfully created. You're all set to start planning trips, logging shared expenses, and settling balances effortlessly.</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://hack-celestial-one.vercel.app'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Your Dashboard</a>
                        </div>
                        <p style="color: gray; font-size: 13px;">
                            If you have questions or feedback, reply directly to this email.<br>
                            Happy travels,<br>The GroupTrip Ledger Team
                        </p>
                    </div>
                </div>
            `,
            text: `Hi ${username},\n\nWelcome to GroupTrip Ledger! Your account has been created successfully.\n\nHappy travels!`
        });
        return { success: true };
    } catch (err) {
        console.warn(`[Welcome Email Error] ${err.message}`);
        return { success: false, error: err.message };
    }
};

module.exports = {
    sendOTPEmail,
    sendEmail,
    sendOfficialInviteEmail,
    sendWelcomeEmail
};
