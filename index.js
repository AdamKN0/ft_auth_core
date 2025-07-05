const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const validator = require("validator");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

const DATA_DIR = path.join(__dirname, "data");
const USER_FILE = path.join(DATA_DIR, "user.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const readFile = filename => fs.readFileSync(filename, 'utf8');
const writeFile = (filename, data) => fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const initFiles = () => {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USER_FILE))
        fs.writeFileSync(USER_FILE, JSON.stringify([]), 'utf8');
};

const sendRes = (res, statusCode, message) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message }));
};

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const server = http.createServer((req, res) => {
    initFiles();
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(PUBLIC_DIR, 'register.html')).pipe(res);
    }
    else if (req.method === 'GET' && req.url === '/verify') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(PUBLIC_DIR, 'verify.html')).pipe(res);
    }
    else if (req.method === 'GET' && req.url === '/login') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(PUBLIC_DIR, 'login.html')).pipe(res);
    }
    else if (req.method === 'POST' && req.url === '/register') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => {
            try {
                let userData;
                try {
                    userData = JSON.parse(body);
                } catch (error) {
                    return sendRes(res, 400, "Invalid JSON format");
                }

                const { username, email, password, confirm } = userData;

                if (!username || !email || !password || !confirm)
                    return sendRes(res, 400, "All fields are required");

                if (password !== confirm)
                    return sendRes(res, 400, "Passwords do not match");

                if (!validator.isAlphanumeric(username) || username.length < 3 || username.length > 20)
                    return sendRes(res, 400, "Username must be alphanumeric and between 3-20 characters");

                if (!validator.isEmail(email))
                    return sendRes(res, 400, "Invalid email format");

                const isStrongPassword = validator.isStrongPassword(password, {
                    minLength: 8,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1
                });
                if (!isStrongPassword || password.length > 12)
                    return sendRes(res, 400, "Password must be strong and max 12 characters");

                let users = JSON.parse(readFile(USER_FILE));
                if (users.some(u => u.email === email))
                    return sendRes(res, 400, "Email already registered");
                if (users.some(u => u.username === username))
                    return sendRes(res, 400, "Username already taken");

                const hashedPassword = await bcrypt.hash(password, 10);
                const code = generateVerificationCode();
                const hashedVerificationCode = await bcrypt.hash(code, 10);
                const user = {
                    id: crypto.randomUUID(),
                    username,
                    email,
                    password: hashedPassword,
                    createdAt: new Date().toISOString(),
                    verificationCode: hashedVerificationCode,
                };

                users.push(user);
                writeFile(USER_FILE, users);

                const mailOptions = {
                    from: `"MyApp Team" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: 'Email Verification',
                    html: `<p>Hello ${user.username},</p><p>Your verification code is: <strong>${code}</strong></p>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Email error:", error.message);
                        return sendRes(res, 500, "Failed to send email.");
                    }
                    console.log("Email sent:", info.response);
                    sendRes(res, 200, "Verification email sent successfully.");
                });

            } catch (error) {
                console.error("Internal error:", error);
                sendRes(res, 500, "Internal Server Error");
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/verify') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => {
            try {
                let verificationData;
                try {
                    verificationData = JSON.parse(body);
                } catch (error) {
                    return sendRes(res, 400, "Invalid JSON format");
                }

                const { email, code } = verificationData;
                if (!email || !code)
                    return sendRes(res, 400, "Email and verification code are required");

                if (!validator.isEmail(email))
                    return sendRes(res, 400, "Invalid email format");

                let users = JSON.parse(readFile(USER_FILE));
                const user = users.find(u => u.email === email);

                if (!user)
                    return sendRes(res, 404, "User not found");

                const isCodeValid = await bcrypt.compare(code, user.verificationCode);
                if (!isCodeValid)
                    return sendRes(res, 400, "Invalid verification code");

                user.verified = true;
                writeFile(USER_FILE, users);

                sendRes(res, 200, "Email verified successfully");
            } catch (error) {
                console.error("Internal error:", error);
                sendRes(res, 500, "Internal Server Error");
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/login') {
        console.log("Login request received");
    }

    else {
        sendRes(res, 404, "Not Found");
    }
});

server.listen(PORT, HOST, () => {
    console.log(`✅ Server running at http://${HOST}:${PORT}`);
});