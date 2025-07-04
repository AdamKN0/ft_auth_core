const http = require('http');


const PORT = 3000;
const HOSTNAME = 'localhost';
const server = http.createServer((req, res)=>
{
    if(req.method === "POST" && req.url === "/register")
    {
        console.log(req.url);
    }
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});