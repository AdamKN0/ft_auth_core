const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const D_data = path.join(__dirname, 'data');
const D_data_file = path.join(D_data, 'data.json');
const PORT = 3000;
const HOSTNAME = 'localhost';

const readFile = filename => fs.readFileSync(filename, 'utf8');
const writeFile = (filename, data) => fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');

const ensureDataDirExists = () => {
    if (!fs.existsSync(D_data))
        fs.mkdirSync(D_data);
    if (!fs.existsSync(D_data_file))
        writeFile(D_data_file, []);
};

const sendResp = (statusCode, message, res) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message }));
};

const server = http.createServer((req, res) => {
    ensureDataDirExists();
    if (req.method === "POST" && req.url === "/register") {
        let body = '';
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const data = JSON.parse(body);
                if (!data.username || !data.email || !data.password || !data.confirm_password)
                    return sendResp(400, "Missing required fields", res);
                if (data.password !== data.confirm_password)
                    return sendResp(400, "Passwords do not match", res);

                const users = JSON.parse(readFile(D_data_file));
                const userExists = users.find(user => user.username === data.username);
                const emailExists = users.find(user => user.email === data.email);
                if (userExists)
                    return sendResp(400, "Username already exists", res);
                if (emailExists)
                    return sendResp(400, "Email already exists", res);

                const hashedPassword = await bcrypt.hash(data.password, 10);

                const newUser = {
                    id: crypto.randomUUID(),
                    username: data.username,
                    email: data.email,
                    password: hashedPassword,
                    created_at: new Date().toISOString()
                };

                users.push(newUser);
                writeFile(D_data_file, users);

                sendResp(200, "User registered successfully", res);
            } catch (error) {
                sendResp(400, "Invalid JSON format", res);
            }
        });
    } else {
        sendResp(404, "Route not found or method not supported", res);
    }
});

server.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});