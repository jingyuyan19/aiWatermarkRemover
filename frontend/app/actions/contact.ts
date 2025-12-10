'use server';

import nodemailer from 'nodemailer';

interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function sendContactEmail(data: ContactFormData) {
    const { name, email, subject, message } = data;

    // logical validation
    if (!name || !email || !subject || !message) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: `"Vanishly Contact Form" <${process.env.SMTP_USER}>`, // authenticated sender
            to: 'support@vanishly.io',
            replyTo: email, // Reply to the user directly
            subject: `[Vanishly Contact] ${subject}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <br/>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br/>')}</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: 'Failed to send email. Please try again later.' };
    }
}
