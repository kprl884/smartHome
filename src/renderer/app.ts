// GoveeAPI will be available globally via window.GoveeAPI
declare const GoveeAPI: any;

interface Device {
  device: string;
  sku?: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds?: string[];
  capabilities?: Array<{
    type: string;
    instance: string;
  }>;
  state?: {
    powerState?: string;
    brightness?: number;
    color?: { r: number; g: number; b: number };
    colorTem?: number;
  };
}

interface DeviceGroup {
  id: string;
  name: string;
  deviceIds: string[];
}

interface Timer {
  id: string;
  name: string;
  device: string;
  model: string;
  time: string;
  action: 'on' | 'off';
  repeat: boolean;
}

class App {
  private api: any = null;
  private devices: Device[] = [];
  private scenarios: any[] = [];
  private groups: DeviceGroup[] = [];
  private timers: Timer[] = [];
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();
  private colorPresets = [
    { r: 255, g: 0, b: 0, name: 'Kırmızı' },
    { r: 0, g: 255, b: 0, name: 'Yeşil' },
    { r: 0, g: 0, b: 255, name: 'Mavi' },
    { r: 255, g: 255, b: 0, name: 'Sarı' },
    { r: 255, g: 0, b: 255, name: 'Magenta' },
    { r: 0, g: 255, b: 255, name: 'Cyan' },
    { r: 255, g: 255, b: 255, name: 'Beyaz' },
    { r: 255, g: 165, b: 0, name: 'Turuncu' },
  ];

  constructor() {
    this.init();
  }

  private async init() {
    this.setupEventListeners();
    await this.loadApiKey();
    this.loadGroups();
    this.loadTimers();
    // Her zaman demo cihazları göster
    await this.loadDevices();
    if (this.api) {
      await this.loadScenarios();
    }
    this.renderGroups();
    this.renderTimers();
    this.startTimers();
  }

  private setupEventListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const quitAppBtn = document.getElementById('quitAppBtn');
    const retryBtn = document.getElementById('retryBtn');
    const addGroupBtn = document.getElementById('addGroupBtn');
    const addTimerBtn = document.getElementById('addTimerBtn');
    const saveGroupBtn = document.getElementById('saveGroupBtn');
    const cancelGroupBtn = document.getElementById('cancelGroupBtn');
    const saveTimerBtn = document.getElementById('saveTimerBtn');
    const cancelTimerBtn = document.getElementById('cancelTimerBtn');

    settingsBtn?.addEventListener('click', () => this.showSettings());
    closeSettingsBtn?.addEventListener('click', () => this.hideSettings());
    saveApiKeyBtn?.addEventListener('click', () => this.saveApiKey());
    quitAppBtn?.addEventListener('click', () => this.quitApp());
    retryBtn?.addEventListener('click', () => this.loadDevices());
    addGroupBtn?.addEventListener('click', () => this.showAddGroupModal());
    addTimerBtn?.addEventListener('click', () => this.showAddTimerModal());
    saveGroupBtn?.addEventListener('click', () => this.saveGroup());
    cancelGroupBtn?.addEventListener('click', () => this.hideAddGroupModal());
    saveTimerBtn?.addEventListener('click', () => this.saveTimer());
    cancelTimerBtn?.addEventListener('click', () => this.hideAddTimerModal());
  }

  private quitApp() {
    if (confirm('Uygulamadan çıkmak istediğinize emin misiniz?')) {
      // Electron IPC kullanarak main process'e quit sinyali gönder
      if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('app-quit');
      } else {
        // Fallback: window.close() (menubar uygulamalarında çalışmayabilir)
        window.close();
      }
    }
  }

  private loadApiKey(): Promise<void> {
    return new Promise((resolve) => {
      const apiKey = localStorage.getItem('govee_api_key');
      if (apiKey && typeof GoveeAPI !== 'undefined') {
        this.api = new GoveeAPI(apiKey);
        resolve();
      } else {
        resolve();
      }
    });
  }

  private async saveApiKey() {
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert('Lütfen API anahtarını girin');
      return;
    }

    localStorage.setItem('govee_api_key', apiKey);
    if (typeof GoveeAPI !== 'undefined') {
      this.api = new GoveeAPI(apiKey);
    }
    this.hideSettings();
    await this.loadDevices();
    await this.loadScenarios();
    this.renderGroups();
    this.renderTimers();
    this.startTimers();
  }

  private showSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    const mainContent = document.getElementById('mainContent');
    const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;

    if (settingsPanel && mainContent) {
      settingsPanel.style.display = 'block';
      mainContent.style.display = 'none';
      const savedKey = localStorage.getItem('govee_api_key');
      if (apiKeyInput && savedKey) {
        apiKeyInput.value = savedKey;
      }
    }
  }

  private hideSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    const mainContent = document.getElementById('mainContent');

    if (settingsPanel && mainContent) {
      settingsPanel.style.display = 'none';
      mainContent.style.display = 'block';
    }
  }

  private showLoading() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const devicesContainer = document.getElementById('devicesContainer');

    if (loading) loading.style.display = 'block';
    if (error) error.style.display = 'none';
    if (devicesContainer) devicesContainer.style.display = 'none';
  }

  private showError(message: string) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const devicesContainer = document.getElementById('devicesContainer');

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'block';
    if (errorMessage) errorMessage.textContent = message;
    if (devicesContainer) devicesContainer.style.display = 'none';
  }

  private showDevices() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const devicesContainer = document.getElementById('devicesContainer');

    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (devicesContainer) devicesContainer.style.display = 'block';
  }

  private getDemoDevices(): Device[] {
    return [
      {
        device: 'DEMO:AA:BB:CC:DD:EE:FF:01',
        sku: 'H605C',
        model: 'H605C',
        deviceName: 'Oturma Odası Işığı',
        controllable: true,
        retrievable: true,
        capabilities: [
          { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
          { type: 'devices.capabilities.range', instance: 'brightness' },
          { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
        ],
        state: {
          powerState: 'on',
          brightness: 75,
          color: { r: 255, g: 200, b: 100 },
          colorTem: 3000,
        },
      },
      {
        device: 'DEMO:AA:BB:CC:DD:EE:FF:02',
        sku: 'H713B',
        model: 'H713B',
        deviceName: 'Yatak Odası Işığı',
        controllable: true,
        retrievable: true,
        capabilities: [
          { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
          { type: 'devices.capabilities.range', instance: 'brightness' },
          { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
        ],
        state: {
          powerState: 'off',
          brightness: 50,
          color: { r: 100, g: 150, b: 255 },
          colorTem: 4000,
        },
      },
      {
        device: 'DEMO:AA:BB:CC:DD:EE:FF:03',
        sku: 'H6601',
        model: 'H6601',
        deviceName: 'Mutfak Işığı',
        controllable: true,
        retrievable: true,
        capabilities: [
          { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
          { type: 'devices.capabilities.range', instance: 'brightness' },
        ],
        state: {
          powerState: 'on',
          brightness: 100,
        },
      },
      {
        device: 'DEMO:AA:BB:CC:DD:EE:FF:04',
        sku: 'H6052',
        model: 'H6052',
        deviceName: 'Çalışma Odası Işığı',
        controllable: true,
        retrievable: true,
        capabilities: [
          { type: 'devices.capabilities.on_off', instance: 'powerSwitch' },
          { type: 'devices.capabilities.range', instance: 'brightness' },
          { type: 'devices.capabilities.color_setting', instance: 'colorRgb' },
        ],
        state: {
          powerState: 'on',
          brightness: 60,
          color: { r: 255, g: 255, b: 255 },
          colorTem: 5000,
        },
      },
    ];
  }

  private async loadDevices() {
    this.showLoading();

    // Önce demo cihazları göster (her zaman)
    const demoDevices = this.getDemoDevices();
    this.devices = demoDevices;

    // Eğer API varsa gerçek cihazları da yükle
    if (this.api) {
      try {
        const realDevices = await this.api.getDevices();
        if (realDevices && realDevices.length > 0) {
          // Gerçek cihazları normalize et ve demo cihazların üzerine ekle
          const normalizedDevices = realDevices.map((device: any) => ({
            ...device,
            model: device.model || device.sku || '',
          }));

          // Gerçek cihazların state'lerini al
          for (const device of normalizedDevices) {
            if (device.retrievable) {
              try {
                const model = device.model || device.sku;
                const state = await this.api.getDeviceState(device.device, model);
                if (state && state.properties && state.properties.length > 0) {
                  device.state = {
                    powerState: state.properties[0]?.powerState,
                    brightness: state.properties[0]?.brightness,
                    color: state.properties[0]?.color,
                    colorTem: state.properties[0]?.colorTem,
                  };
                }
              } catch (error) {
                console.error(`Failed to get state for ${device.deviceName}:`, error);
              }
            }
          }

          // Gerçek cihazları demo cihazların üzerine ekle
          this.devices = [...normalizedDevices, ...demoDevices];
        }
      } catch (error: any) {
        console.error('Failed to load real devices:', error);
        // Hata olsa bile demo cihazları göster
      }
    }

    this.renderDevices();
    this.showDevices();
  }

  private async loadScenarios() {
    if (!this.api) return;

    try {
      this.scenarios = await this.api.getScenarios();
      this.renderScenarios();
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  }

  private renderDevices() {
    const devicesList = document.getElementById('devicesList');
    if (!devicesList) return;

    devicesList.innerHTML = '';

    this.devices.forEach((device) => {
      const deviceCard = this.createDeviceCard(device);
      devicesList.appendChild(deviceCard);
    });
  }

  private createDeviceCard(device: Device): HTMLElement {
    const card = document.createElement('div');
    card.className = 'device-card';
    
    // Demo cihazlar için özel stil
    if (device.device.startsWith('DEMO:')) {
      card.style.borderLeft = '4px solid #667eea';
      card.style.position = 'relative';
    }

    const isOn = device.state?.powerState === 'on';
    const brightness = device.state?.brightness || 50;
    const color = device.state?.color || { r: 255, g: 255, b: 255 };
    const isDemo = device.device.startsWith('DEMO:');

    card.innerHTML = `
      <div class="device-header">
        <div>
          <div class="device-name">
            ${device.deviceName}
            ${isDemo ? '<span style="font-size: 10px; color: #667eea; margin-left: 8px; font-weight: normal;">(DEMO)</span>' : ''}
          </div>
          <div class="device-model">${device.model}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${isOn ? 'checked' : ''} data-device="${device.device}" data-model="${device.model}">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="device-controls">
        ${(device.capabilities?.some(cap => cap.type === 'devices.capabilities.range' && cap.instance === 'brightness') || device.supportCmds?.includes('brightness')) ? `
          <div class="control-group">
            <label class="control-label">Parlaklık: ${brightness}%</label>
            <input type="range" class="brightness-slider" min="1" max="100" value="${brightness}" 
                   data-device="${device.device}" data-model="${device.model}">
          </div>
        ` : ''}
        ${(device.capabilities?.some(cap => cap.type === 'devices.capabilities.color_setting') || device.supportCmds?.includes('color')) ? `
          <div class="control-group">
            <label class="control-label">Renk</label>
            <div class="color-picker-container">
              <input type="color" class="color-input" 
                     value="#${this.rgbToHex(color.r, color.g, color.b)}"
                     data-device="${device.device}" data-model="${device.model}">
              <div class="color-presets">
                ${this.colorPresets.map((preset, idx) => `
                  <div class="color-preset" 
                       style="background-color: rgb(${preset.r}, ${preset.g}, ${preset.b})"
                       data-device="${device.device}" 
                       data-model="${device.model}"
                       data-r="${preset.r}" 
                       data-g="${preset.g}" 
                       data-b="${preset.b}"
                       title="${preset.name}"></div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const toggle = card.querySelector('input[type="checkbox"]');
    toggle?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const isChecked = target.checked;
      this.toggleDevice(device.device, device.model, isChecked);
    });

    const brightnessSlider = card.querySelector('.brightness-slider');
    brightnessSlider?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value);
      const label = target.previousElementSibling as HTMLLabelElement;
      if (label) {
        label.textContent = `Parlaklık: ${value}%`;
      }
    });

    brightnessSlider?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value);
      this.setBrightness(device.device, device.model, value);
    });

    const colorInput = card.querySelector('.color-input');
    colorInput?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const rgb = this.hexToRgb(target.value);
      if (rgb) {
        this.setColor(device.device, device.model, rgb.r, rgb.g, rgb.b);
      }
    });

    const colorPresets = card.querySelectorAll('.color-preset');
    colorPresets.forEach((preset) => {
      preset.addEventListener('click', () => {
        const r = parseInt(preset.getAttribute('data-r') || '255');
        const g = parseInt(preset.getAttribute('data-g') || '255');
        const b = parseInt(preset.getAttribute('data-b') || '255');
        this.setColor(device.device, device.model, r, g, b);
      });
    });

    return card;
  }

  private renderScenarios() {
    const scenariosList = document.getElementById('scenariosList');
    const scenariosSection = document.getElementById('scenariosSection');

    if (!scenariosList || !scenariosSection) return;

    if (this.scenarios.length === 0) {
      scenariosSection.style.display = 'none';
      return;
    }

    scenariosSection.style.display = 'block';
    scenariosList.innerHTML = '';

    this.scenarios.forEach((scenario) => {
      const scenarioItem = document.createElement('div');
      scenarioItem.className = 'scenario-item';
      scenarioItem.innerHTML = `
        <span class="scenario-name">${scenario.sceneName || scenario.scene || 'Senaryo'}</span>
        <button class="btn btn-primary" data-scenario="${scenario.scene || scenario.sceneId}">Çalıştır</button>
      `;

      const runBtn = scenarioItem.querySelector('button');
      runBtn?.addEventListener('click', () => {
        const scenarioId = runBtn.getAttribute('data-scenario');
        if (scenarioId) {
          this.runScenario(scenarioId);
        }
      });

      scenariosList.appendChild(scenarioItem);
    });
  }

  private async toggleDevice(device: string, model: string, turnOn: boolean) {
    // Demo cihazlar için local state güncelle
    if (device.startsWith('DEMO:')) {
      const demoDevice = this.devices.find(d => d.device === device);
      if (demoDevice && demoDevice.state) {
        demoDevice.state.powerState = turnOn ? 'on' : 'off';
        this.renderDevices();
      }
      return;
    }

    if (!this.api) {
      alert('API anahtarı gerekli. Lütfen ayarlardan API anahtarınızı girin.');
      return;
    }

    try {
      const sku = model || this.devices.find(d => d.device === device)?.sku || model;
      if (turnOn) {
        await this.api.turnOn(device, sku);
      } else {
        await this.api.turnOff(device, sku);
      }
      // State'i güncellemek için kısa bir bekleme sonrası reload
      setTimeout(() => this.loadDevices(), 500);
    } catch (error) {
      console.error('Failed to toggle device:', error);
      alert('Cihaz kontrolü başarısız oldu: ' + (error as Error).message);
    }
  }

  private async setBrightness(device: string, model: string, brightness: number) {
    // Demo cihazlar için local state güncelle
    if (device.startsWith('DEMO:')) {
      const demoDevice = this.devices.find(d => d.device === device);
      if (demoDevice && demoDevice.state) {
        demoDevice.state.brightness = brightness;
        this.renderDevices();
      }
      return;
    }

    if (!this.api) {
      alert('API anahtarı gerekli. Lütfen ayarlardan API anahtarınızı girin.');
      return;
    }

    try {
      const sku = model || this.devices.find(d => d.device === device)?.sku || model;
      await this.api.setBrightness(device, sku, brightness);
    } catch (error) {
      console.error('Failed to set brightness:', error);
      alert('Parlaklık ayarı başarısız oldu: ' + (error as Error).message);
    }
  }

  private async setColor(device: string, model: string, r: number, g: number, b: number) {
    // Demo cihazlar için local state güncelle
    if (device.startsWith('DEMO:')) {
      const demoDevice = this.devices.find(d => d.device === device);
      if (demoDevice && demoDevice.state) {
        demoDevice.state.color = { r, g, b };
        this.renderDevices();
      }
      return;
    }

    if (!this.api) {
      alert('API anahtarı gerekli. Lütfen ayarlardan API anahtarınızı girin.');
      return;
    }

    try {
      const sku = model || this.devices.find(d => d.device === device)?.sku || model;
      await this.api.setColor(device, sku, r, g, b);
    } catch (error) {
      console.error('Failed to set color:', error);
      alert('Renk ayarı başarısız oldu: ' + (error as Error).message);
    }
  }

  private async runScenario(scenarioId: string) {
    if (!this.api) return;

    try {
      await this.api.runScenario(scenarioId);
      alert('Senaryo çalıştırıldı!');
    } catch (error) {
      console.error('Failed to run scenario:', error);
      alert('Senaryo çalıştırılamadı.');
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private loadGroups() {
    const saved = localStorage.getItem('device_groups');
    if (saved) {
      this.groups = JSON.parse(saved);
    }
  }

  private saveGroups() {
    localStorage.setItem('device_groups', JSON.stringify(this.groups));
  }

  private loadTimers() {
    const saved = localStorage.getItem('timers');
    if (saved) {
      this.timers = JSON.parse(saved);
    }
  }

  private saveTimers() {
    localStorage.setItem('timers', JSON.stringify(this.timers));
  }

  private renderGroups() {
    const groupsList = document.getElementById('groupsList');
    const groupsSection = document.getElementById('groupsSection');

    if (!groupsList || !groupsSection) return;

    if (this.groups.length === 0) {
      groupsSection.style.display = 'none';
      return;
    }

    groupsSection.style.display = 'block';
    groupsList.innerHTML = '';

    this.groups.forEach((group) => {
      const groupItem = document.createElement('div');
      groupItem.className = 'group-item';
      const groupDevices = this.devices
        .filter((d) => group.deviceIds.includes(d.device))
        .map((d) => d.deviceName)
        .join(', ');

      groupItem.innerHTML = `
        <div>
          <div class="group-name">${group.name}</div>
          <div class="group-devices">${groupDevices || 'Cihaz yok'}</div>
        </div>
        <div>
          <button class="btn btn-primary btn-small" data-group-id="${group.id}">Kontrol Et</button>
          <button class="btn btn-danger btn-small" data-group-id="${group.id}" data-action="delete">Sil</button>
        </div>
      `;

      const controlBtn = groupItem.querySelector('button[data-group-id]');
      controlBtn?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const groupId = target.getAttribute('data-group-id');
        if (target.getAttribute('data-action') === 'delete') {
          this.deleteGroup(groupId!);
        } else {
          this.controlGroup(groupId!);
        }
      });

      groupsList.appendChild(groupItem);
    });
  }

  private renderTimers() {
    const timersList = document.getElementById('timersList');
    const timersSection = document.getElementById('timersSection');

    if (!timersList || !timersSection) return;

    if (this.timers.length === 0) {
      timersSection.style.display = 'none';
      return;
    }

    timersSection.style.display = 'block';
    timersList.innerHTML = '';

    this.timers.forEach((timer) => {
      const timerItem = document.createElement('div');
      timerItem.className = 'timer-item';
      const device = this.devices.find((d) => d.device === timer.device);
      const repeatText = timer.repeat ? 'Her gün' : 'Bir kez';

      timerItem.innerHTML = `
        <div>
          <div class="timer-name">${timer.name}</div>
          <div class="timer-info">${device?.deviceName || timer.device} - ${timer.time} - ${timer.action === 'on' ? 'Aç' : 'Kapat'} - ${repeatText}</div>
        </div>
        <button class="btn btn-danger btn-small" data-timer-id="${timer.id}">Sil</button>
      `;

      const deleteBtn = timerItem.querySelector('button');
      deleteBtn?.addEventListener('click', () => {
        this.deleteTimer(timer.id);
      });

      timersList.appendChild(timerItem);
    });
  }

  private showAddGroupModal() {
    const modal = document.getElementById('addGroupModal');
    const checkboxesContainer = document.getElementById('groupDevicesCheckboxes');

    if (!modal || !checkboxesContainer) return;

    checkboxesContainer.innerHTML = '';
    this.devices.forEach((device) => {
      const checkboxItem = document.createElement('div');
      checkboxItem.className = 'checkbox-item';
      checkboxItem.innerHTML = `
        <input type="checkbox" id="device-${device.device}" value="${device.device}">
        <label for="device-${device.device}">${device.deviceName}</label>
      `;
      checkboxesContainer.appendChild(checkboxItem);
    });

    modal.style.display = 'flex';
  }

  private hideAddGroupModal() {
    const modal = document.getElementById('addGroupModal');
    if (modal) {
      modal.style.display = 'none';
      const nameInput = document.getElementById('groupNameInput') as HTMLInputElement;
      if (nameInput) nameInput.value = '';
    }
  }

  private showAddTimerModal() {
    const modal = document.getElementById('addTimerModal');
    const deviceSelect = document.getElementById('timerDeviceSelect') as HTMLSelectElement;

    if (!modal || !deviceSelect) return;

    deviceSelect.innerHTML = '';
    this.devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = `${device.device}|${device.model}`;
      option.textContent = device.deviceName;
      deviceSelect.appendChild(option);
    });

    modal.style.display = 'flex';
  }

  private hideAddTimerModal() {
    const modal = document.getElementById('addTimerModal');
    if (modal) {
      modal.style.display = 'none';
      const nameInput = document.getElementById('timerNameInput') as HTMLInputElement;
      const timeInput = document.getElementById('timerTimeInput') as HTMLInputElement;
      if (nameInput) nameInput.value = '';
      if (timeInput) timeInput.value = '';
    }
  }

  private saveGroup() {
    const nameInput = document.getElementById('groupNameInput') as HTMLInputElement;
    const checkboxes = document.querySelectorAll('#groupDevicesCheckboxes input[type="checkbox"]:checked');

    if (!nameInput || checkboxes.length === 0) {
      alert('Lütfen grup adı girin ve en az bir cihaz seçin');
      return;
    }

    const group: DeviceGroup = {
      id: Date.now().toString(),
      name: nameInput.value.trim(),
      deviceIds: Array.from(checkboxes).map((cb) => (cb as HTMLInputElement).value),
    };

    this.groups.push(group);
    this.saveGroups();
    this.renderGroups();
    this.hideAddGroupModal();

    const groupsSection = document.getElementById('groupsSection');
    if (groupsSection) groupsSection.style.display = 'block';
  }

  private saveTimer() {
    const nameInput = document.getElementById('timerNameInput') as HTMLInputElement;
    const deviceSelect = document.getElementById('timerDeviceSelect') as HTMLSelectElement;
    const timeInput = document.getElementById('timerTimeInput') as HTMLInputElement;
    const actionSelect = document.getElementById('timerActionSelect') as HTMLSelectElement;
    const repeatCheckbox = document.getElementById('timerRepeatCheckbox') as HTMLInputElement;

    if (!nameInput || !deviceSelect || !timeInput) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const [device, model] = deviceSelect.value.split('|');

    const timer: Timer = {
      id: Date.now().toString(),
      name: nameInput.value.trim(),
      device,
      model,
      time: timeInput.value,
      action: actionSelect.value as 'on' | 'off',
      repeat: repeatCheckbox.checked,
    };

    this.timers.push(timer);
    this.saveTimers();
    this.renderTimers();
    this.hideAddTimerModal();
    this.startTimers();

    const timersSection = document.getElementById('timersSection');
    if (timersSection) timersSection.style.display = 'block';
  }

  private deleteGroup(groupId: string) {
    if (confirm('Bu grubu silmek istediğinize emin misiniz?')) {
      this.groups = this.groups.filter((g) => g.id !== groupId);
      this.saveGroups();
      this.renderGroups();
    }
  }

  private deleteTimer(timerId: string) {
    if (confirm('Bu zamanlayıcıyı silmek istediğinize emin misiniz?')) {
      const interval = this.timerIntervals.get(timerId);
      if (interval) {
        clearInterval(interval);
        this.timerIntervals.delete(timerId);
      }
      this.timers = this.timers.filter((t) => t.id !== timerId);
      this.saveTimers();
      this.renderTimers();
    }
  }

  private async controlGroup(groupId: string) {
    if (!this.api) return;

    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return;

    try {
      for (const deviceId of group.deviceIds) {
        const device = this.devices.find((d) => d.device === deviceId);
        if (device) {
          await this.api.turnOn(device.device, device.model);
        }
      }
      alert('Grup cihazları açıldı!');
      await this.loadDevices();
    } catch (error) {
      console.error('Failed to control group:', error);
      alert('Grup kontrolü başarısız oldu.');
    }
  }

  private startTimers() {
    // Clear existing intervals
    this.timerIntervals.forEach((interval) => clearInterval(interval));
    this.timerIntervals.clear();

    if (!this.api) return;

    this.timers.forEach((timer) => {
      const checkTimer = () => {
        const now = new Date();
        const [hours, minutes] = timer.time.split(':');
        const timerTime = new Date();
        timerTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const device = this.devices.find((d) => d.device === timer.device);
        if (!device) return;

        if (now.getHours() === timerTime.getHours() && now.getMinutes() === timerTime.getMinutes()) {
          if (timer.action === 'on') {
            this.api.turnOn(timer.device, timer.model);
          } else {
            this.api.turnOff(timer.device, timer.model);
          }
        }
      };

      // Check every minute
      const interval = setInterval(checkTimer, 60000);
      this.timerIntervals.set(timer.id, interval);

      // Check immediately
      checkTimer();
    });
  }
}

// Initialize app when DOM is ready
let appInstance: App;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    appInstance = new App();
    (window as any).appInstance = appInstance;
  });
} else {
  appInstance = new App();
  (window as any).appInstance = appInstance;
}

