const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');

let mainWindow;
let serverProcess;

function killPort5000() {
    try {
        if (process.platform === 'win32') {
            const output = execSync('netstat -ano | findstr :5000').toString();
            const processLines = output.trim().split('\n');
            processLines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0' && !isNaN(pid)) {
                    console.log(`[Electron] Killing existing process ${pid} on port 5000...`);
                    try { execSync(`taskkill /F /PID ${pid}`); } catch (e) { }
                }
            });
        }
    } catch (e) {
        // Port probably not in use
    }
}

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

    const tryLoad = () => {
        console.log(`[Electron] Attempting to load: ${url}`);
        mainWindow.loadURL(url).catch(err => {
            console.log(`[Electron] Load failed, will retry: ${err.message}`);
        });
    };

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log(`[Electron] Failed to load (code: ${errorCode}, ${errorDescription}). Retrying in 3 seconds...`);
        setTimeout(tryLoad, 3000);
    });

    mainWindow.webContents.on('dom-ready', () => {
        console.log('[Electron] App loaded and DOM ready!');
    });

    // DevTools can still be opened manually with Ctrl+Shift+I in development mode
    tryLoad();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startServer() {
    killPort5000();
    const isDev = !app.isPackaged;

    if (isDev) {
        console.log('[Electron] Dev mode: Starting server via npm run dev...');
        serverProcess = spawn('npm', ['run', 'dev'], {
            shell: true,
            env: { ...process.env, PORT: '5000' }
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Server] ${data.toString().trim()}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Server Error] ${data.toString().trim()}`);
        });
    } else {
        const serverPath = path.join(__dirname, 'dist/index.cjs');
        serverProcess = spawn('node', [serverPath], {
            env: { ...process.env, NODE_ENV: 'production', PORT: '5000' }
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Server] ${data.toString().trim()}`);
        });
    }
}

app.on('ready', () => {
    startServer();
    console.log('[Electron] System ready, waiting for server to check in...');
    setTimeout(createWindow, 3000);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        if (serverProcess) {
            console.log('[Electron] Killing server process tree...');
            if (process.platform === 'win32') {
                try { execSync('taskkill /F /T /PID ' + serverProcess.pid); } catch (e) { }
            } else {
                serverProcess.kill();
            }
        }
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
