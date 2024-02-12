const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises; // For file operations
const cors = require('cors');

const app = express();
let apps = {}; // Initialize as empty object

app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Function to load app information from file
async function loadApps() {
    try {
        const data = await fs.readFile('apps.json', 'utf8');
        apps = JSON.parse(data);
        console.log('Apps loaded:', apps);
    } catch (error) {
        console.error('Error loading apps:', error);
    }
}

// Function to save app information to file
async function saveApps() {
    try {
        await fs.writeFile('apps.json', JSON.stringify(apps, null, 2));
        console.log('Apps saved');
    } catch (error) {
        console.error('Error saving apps:', error);
    }
}

// Load apps when the server starts
loadApps();

// Function to start a new app and assign it a local port
function startApp(appInfo) {
    const { name, path, team, logRequest } = appInfo;
    const port = Math.floor(Math.random() * (65535 - 49152) + 49152); // Random port in the range 49152 to 65535
    const command = `node ${path} --port ${port}`;
    const childProcess = exec(command);

    apps.push({
        name: name,
        status: 'running',
        port,
        path,
        team,
        logRequest,
        //process: childProcess
    });

    console.log(`${name} started on port ${port}`);
}

// GET endpoint to retrieve info about all registered apps
app.get('/info', (req, res) => {
    res.json(apps);
});

// POST endpoint to register a new app
app.post('/register', (req, res) => {
    const { name, path, team, logRequest } = req.body;

    if (!name || !path || !team) {
        return res.status(400).json({ error: 'Name, path, and team are required' });
    }

    if (apps.some(app => app.name === name)) {
        return res.status(400).json({ error: 'App with this name already registered' });
    }

    startApp({ name, path, team, logRequest });

    // Save the updated app information
    saveApps();

    res.json({ success: true });
});

app.post('/start/:name', (req, res) => {
    const { name } = req.params;

    const appIndex = apps.findIndex(app => app.name === name);
    if (appIndex === -1) {
        return res.status(404).json({ error: 'App not found' });
    }

    if (apps[appIndex].status === 'running') {
        return res.json({ message: 'App is already running' });
    }

    apps[appIndex].status = 'running';
    // Logic to start the app if it's not already running
    // For simplicity, let's assume the app is started successfully

    saveApps();

    res.json({ success: true });
});

app.post('/start-multiple', (req, res) => {
    const { names } = req.body;

    if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ error: 'Names must be provided as a non-empty array' });
    }

    const successMessages = [];
    const errorMessages = [];

    names.forEach(name => {
        const appIndex = apps.findIndex(app => app.name === name);
        if (appIndex === -1) {
            errorMessages.push(`App '${name}' not found`);
        } else if (apps[appIndex].status === 'running') {
            errorMessages.push(`App '${name}' is already running`);
        } else {
            apps[appIndex].status = 'running';
            // Logic to start the app if it's not already running
            // For simplicity, let's assume the app is started successfully
            successMessages.push(`App '${name}' started successfully`);
        }
    });

    saveApps();

    res.json({ success: successMessages, error: errorMessages });
});


app.post('/stop/:name', (req, res) => {
    const { name } = req.params;

    const appIndex = apps.findIndex(app => app.name === name);
    if (appIndex === -1) {
        return res.status(404).json({ error: 'App not found' });
    }

    if (apps[appIndex].status === 'stopped') {
        return res.json({ message: 'App is already stopped' });
    }

    apps[appIndex].status = 'stopped';
    saveApps();

    res.json({ success: true });
});


const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});