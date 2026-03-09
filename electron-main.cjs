const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        title: "Report Management System",
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'client/public/school-logo.png')
    });

    const url = 'http://127.0.0.1:5000';

    // Polling function to wait for server
    const tryLoad = () => {
        console.log(`Attempting to load: ${url}`);
        mainWindow.loadURL(url);
    };

    // Retry on failure
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log(`Failed to load (code: ${errorCode}). Retrying in 2 seconds...`);
        setTimeout(tryLoad, 2000);
    });

    mainWindow.webContents.on('dom-ready', () => {
        console.log('App loaded successfully!');
    });

    // DevTools can still be opened manually with Ctrl+Shift+I in development mode
    tryLoad();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startServer() {
    const isDev = !app.isPackaged;

    if (isDev) {
        console.log('Dev mode: Starting server via npm run dev...');
        serverProcess = spawn('npm', ['run', 'dev'], {
            shell: true,
            env: { ...process.env, PORT: '5000' }
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Server: ${output}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data.toString()}`);
        });
    } else {
        const serverPath = path.join(__dirname, 'dist/index.cjs');
        serverProcess = spawn('node', [serverPath], {
            env: { ...process.env, NODE_ENV: 'production', PORT: '5000' }
        });
    }
}

app.on('ready', () => {
    startServer();
    // Start with a small delay, then retry loop handles the rest
    setTimeout(createWindow, 3000);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        if (serverProcess) serverProcess.kill();
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
