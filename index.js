const http = require('http');
const fs = require('fs');
const path = require('path');

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
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                if (!data.username || !data.email || !data.password || !data.confirmPassword)
                    return sendResp(400, "Missing required fields", res);
                if (data.password !== data.confirmPassword)
                    return sendResp(400, "Passwords do not match", res);

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