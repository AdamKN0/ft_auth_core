const http = require("http");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

dotenv.config();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const DATA_DIR = path.join(__dirname, "data");
const USER_FILE = path.join(DATA_DIR, "user.json");

const initFiles = () => {
    if (!fs.existsSync(DATA_DIR))
        fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USER_FILE))
        fs.writeFileSync(USER_FILE, JSON.stringify([]), 'utf8');
};

const readFile = filename => fs.readFileSync(filename, 'utf8');
const writeFile = (filename, data) => fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');

const sendRes = (res, statusCode, message) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message }));
};

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(path.join(__dirname, 'public', 'register.html')).pipe(res);
    }
    else if (req.method === 'POST' && req.url === '/register') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const userData = JSON.parse(body);

                if (!userData.username || !userData.email || !userData.password || !userData.confirm)
                    return sendRes(res, 400, "All fields are required");
                if (userData.password !== userData.confirm)
                    return sendRes(res, 400, "Passwords do not match");

                if (!validator.isAlphanumeric(userData.username) || userData.username.length < 3 || userData.username.length > 20)
                    return sendRes(res, 400, "Username must be alphanumeric and between 3-20 characters");
                const isStrongPassword = validator.isStrongPassword(userData.password, {
                    minLength: 8,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1
                });
                if (!isStrongPassword || userData.password.length > 12)
                    return sendRes(res, 400, "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols");

                let users = JSON.parse(readFile(USER_FILE));

                const emailExists = users.find(user => user.email === userData.email);
                const usernameExists = users.find(user => user.username === userData.username);
                if (emailExists)
                    return sendRes(res, 400, "Email already registered");
                if (usernameExists)
                    return sendRes(res, 400, "Username already taken");


                const hashedPassword = await bcrypt.hash(userData.password, 10);
                const user = {
                    id: crypto.randomUUID(),
                    username: userData.username,
                    email: userData.email,
                    password: hashedPassword,
                    createdAt: new Date().toISOString()
                };

                users.push(user);
                writeFile(USER_FILE, users);

                sendRes(res, 200, "User registered successfully");
            } catch (error) {
                console.error(error);
                sendRes(res, 500, "Internal Server Error");
            }
        });
    } else {
        sendRes(res, 404, "Not Found");
    }
});

initFiles();
server.listen(PORT, HOST, () => {
    console.log(`Server is listening on http://${HOST}:${PORT}`);
});