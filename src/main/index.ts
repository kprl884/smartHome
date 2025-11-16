import { app, BrowserWindow, ipcMain, Menu, Tray } from 'electron';
import * as path from 'path';
const menubarModule = require('menubar');
const menubar = menubarModule.menubar || menubarModule.default || menubarModule;

let mb: any;
let tray: Tray | null = null;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

app.whenReady().then(() => {
  mb = menubar({
    index: `file://${path.join(__dirname, '../renderer/index.html')}`,
    tooltip: 'SmartHome - Govee Control',
    browserWindow: {
      width: 380,
      height: 650,
      resizable: isDev,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    },
    icon: path.join(__dirname, '../../assets/icon.png').replace(/\\/g, '/'),
    preloadWindow: true,
  });

  mb.on('ready', () => {
    console.log('Menu bar app is ready');
    if (isDev) {
      console.log('Development mode: Dev tools will open automatically');
    }
    
    // Tray menüsü oluştur
    tray = mb.tray;
    if (tray) {
      createTrayMenu();
    }
  });

  mb.on('after-create-window', () => {
    if (mb.window) {
      // Make GoveeAPI available globally in renderer
      const goveePath = path.join(__dirname, '../api/govee.js').replace(/\\/g, '/');
      mb.window.webContents.executeJavaScript(`
        try {
          const { GoveeAPI } = require('${goveePath}');
          window.GoveeAPI = GoveeAPI;
        } catch (error) {
          console.error('GoveeAPI yüklenemedi:', error);
        }
      `);
      
      // Dev mode'da dev tools aç
      if (isDev) {
        mb.window.webContents.openDevTools();
      }
    }
  });

  // IPC handler for quit
  ipcMain.on('app-quit', () => {
    app.quit();
  });
});

function createTrayMenu() {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'SmartHome',
      enabled: false,
    },
    {
      type: 'separator',
    },
    {
      label: 'Ayarlar',
      click: () => {
        if (mb && mb.window) {
          mb.window.show();
          mb.window.webContents.executeJavaScript(`
            if (window.appInstance) {
              window.appInstance.showSettings();
            }
          `);
        }
      },
    },
    {
      type: 'separator',
    },
    {
      label: 'Çıkış',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  
  // Tray'e tıklandığında pencereyi göster/gizle
  tray.on('click', () => {
    if (mb && mb.window) {
      if (mb.window.isVisible()) {
        mb.window.hide();
      } else {
        mb.window.show();
      }
    }
  });
}

app.on('window-all-closed', (e: Electron.Event) => {
  // Menubar uygulamalarında window kapanınca app kapanmamalı
  // Sadece tray'de kalmalı
});

