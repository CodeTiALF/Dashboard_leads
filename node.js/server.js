const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');
const chokidar = require('chokidar'); 
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static('public'));

// CSV file path
const csvFile = 'leads.csv';

// Function to read and parse CSV
function processCSV() {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFile, { encoding: 'utf-8' })
            .pipe(parse({
                delimiter: ';',
                columns: true,
                skip_empty_lines: true,
                bom: true,
                quote: '"',
                relax_quotes: true
            }))
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// Watch for changes in the CSV file
chokidar.watch(csvFile).on('change', async () => {
    try {
        const data = await processCSV();
        io.emit('data-update', data);
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
});

// Socket.IO connection handler
io.on('connection', async (socket) => {
    console.log('Client connected');
    try {
        const data = await processCSV();
        socket.emit('initial-data', data);
    } catch (error) {
        console.error('Error sending initial data:', error);
    }
});

// IP configuration
const PRIMARY_IP = '192.168.15.200';
const SECONDARY_IP = '172.29.1.134';
const PORT = 8010;

// Function to check if IP is available on network interfaces
function isIPAvailable(ip) {
    const networkInterfaces = os.networkInterfaces();
    return Object.values(networkInterfaces).some(interfaces => 
        interfaces.some(int => int.address === ip)
    );
}

// Start server with IP testing
async function startServer() {
    try {
        if (isIPAvailable(PRIMARY_IP)) {
            server.listen(PORT, PRIMARY_IP, () => {
                console.log(`Server running at http://${PRIMARY_IP}:${PORT}`);
            });
        } else {
            console.log(`Primary IP ${PRIMARY_IP} is not available, trying secondary IP...`);
            if (isIPAvailable(SECONDARY_IP)) {
                server.listen(PORT, SECONDARY_IP, () => {
                    console.log(`Server running at http://${SECONDARY_IP}:${PORT}`);
                });
            } else {
                console.log('Both IPs are unavailable, falling back to all interfaces (0.0.0.0)');
                server.listen(PORT, '0.0.0.0', () => {
                    console.log(`Server running on all interfaces at port ${PORT}`);
                    console.log('You can access it using any of these IPs:');
                    Object.values(os.networkInterfaces()).forEach(interfaces => {
                        interfaces.forEach(int => {
                            if (int.family === 'IPv4') {
                                console.log(`http://${int.address}:${PORT}`);
                            }
                        });
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error starting server:', error);
        console.log('Falling back to all interfaces (0.0.0.0)');
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
}

// Start the server
startServer();