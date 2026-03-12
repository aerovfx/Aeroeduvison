import { app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const defaultWebUrl = "http://127.0.0.1:3000";
const diagOnly = process.env.DESKTOP_DIAG_ONLY === "1";

// Aggressive compatibility mode to avoid black-screen issues.
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("use-angle", "swiftshader");
app.commandLine.appendSwitch("enable-unsafe-swiftshader");
app.disableHardwareAcceleration();

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  const webUrl = process.env.DESKTOP_WEB_URL || defaultWebUrl;

  if (diagOnly) {
    const diagHtml = `data:text/html,${encodeURIComponent(
      `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8ff00;color:#111;font-family:Arial,sans-serif">
         <div style="text-align:center">
           <h1 style="margin:0 0 12px 0">DIAG MODE OK</h1>
           <p style="margin:0">If you can read this, Electron rendering works.</p>
         </div>
       </body></html>`
    )}`;
    void win.loadURL(diagHtml);
    win.show();
    win.focus();
    return;
  }
  const splashHtml = `data:text/html,${encodeURIComponent(
    `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#ffffff;color:#111;font-family:Arial,sans-serif">
      <div><h2 style="margin:0 0 8px 0">Loading AeroEdu...</h2><p style="margin:0;color:#444">${webUrl}</p></div>
    </body></html>`
  )}`;

  console.log("[desktop] loading splash");
  void win.loadURL(splashHtml).then(() => {
    console.log("[desktop] splash loaded, loading app URL:", webUrl);
    setTimeout(() => {
      void win.loadURL(webUrl);
    }, 150);
  });

  win.webContents.on("did-start-loading", () => {
    console.log("[desktop] did-start-loading");
  });

  win.webContents.on("dom-ready", () => {
    console.log("[desktop] dom-ready");
  });

  win.webContents.on("did-finish-load", () => {
    console.log("[desktop] did-finish-load:", webUrl);
    void win.webContents
      .executeJavaScript(`
        (() => ({
          href: location.href,
          title: document.title,
          readyState: document.readyState
        }))();
      `)
      .then((result) => console.log("[desktop] executeJavaScript result:", result))
      .catch((error) => console.error("[desktop] executeJavaScript failed:", error));

    if (!win.isVisible()) {
      win.show();
      win.focus();
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("[desktop] did-fail-load:", { errorCode, errorDescription, validatedURL });
    void win.loadURL(
      `data:text/html,${encodeURIComponent(
        `<html><body style="font-family:Arial;padding:24px;background:#0b1020;color:#fff">
           <h2>Desktop failed to load web content</h2>
           <p><b>URL:</b> ${validatedURL || webUrl}</p>
           <p><b>Error:</b> ${errorDescription} (${errorCode})</p>
           <p>Ensure web server is running and reachable, then restart desktop app.</p>
         </body></html>`
      )}`
    );
    if (!win.isVisible()) {
      win.show();
      win.focus();
    }
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[desktop] render-process-gone:", details);
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: "right" });
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("gpu-process-crashed", (_event, killed) => {
  console.error("[desktop] gpu-process-crashed:", { killed });
});
