interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds: string[];
}

interface GoveeDeviceState {
  device: string;
  model: string;
  properties: Array<{
    powerState?: string;
    brightness?: number;
    color?: {
      r: number;
      g: number;
      b: number;
    };
    colorTem?: number;
  }>;
}

interface GoveeResponse<T> {
  code: number;
  message: string;
  data: T;
}

// UUID generator
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class GoveeAPI {
  private apiKey: string;
  private baseUrl = 'https://openapi.api.govee.com/router/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<GoveeResponse<T>> {
    const requestId = generateRequestId();
    let url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Govee-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === 'GET') {
      // GET request'ler için requestId query parameter olarak ekle
      const urlObj = new URL(url);
      urlObj.searchParams.set('requestId', requestId);
      url = urlObj.toString();
    } else if (body && method === 'POST') {
      // POST request'ler için requestId body'ye ekle
      const bodyWithRequestId = {
        requestId,
        ...body,
      };
      options.body = JSON.stringify(bodyWithRequestId);
    } else if (method === 'POST') {
      // Body yoksa sadece requestId ekle
      options.body = JSON.stringify({ requestId });
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data as GoveeResponse<T>;
    } catch (error) {
      console.error('Govee API request failed:', error);
      throw error;
    }
  }

  async getDevices(): Promise<GoveeDevice[]> {
    const response = await this.request<GoveeDevice[]>('/user/devices');
    if (response.code === 200 && response.data) {
      // Response.data direkt array dönüyor
      return Array.isArray(response.data) ? response.data : [];
    }
    throw new Error(response.message || 'Failed to fetch devices');
  }

  async getDeviceState(device: string, model: string): Promise<GoveeDeviceState> {
    const response = await this.request<GoveeDeviceState>(
      `/device/state?device=${encodeURIComponent(device)}&model=${encodeURIComponent(model)}`
    );
    if (response.code === 200 && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to fetch device state');
  }

  async controlDevice(
    device: string,
    model: string,
    capability: {
      type: string;
      instance: string;
      value: any;
    }
  ): Promise<boolean> {
    const response = await this.request<{ command: any }>(
      '/device/control',
      'POST',
      {
        payload: {
          device,
          sku: model,
          capability,
        },
      }
    );
    return response.code === 200;
  }

  async turnOn(device: string, model: string): Promise<boolean> {
    return this.controlDevice(device, model, {
      type: 'devices.capabilities.on_off',
      instance: 'powerSwitch',
      value: 1,
    });
  }

  async turnOff(device: string, model: string): Promise<boolean> {
    return this.controlDevice(device, model, {
      type: 'devices.capabilities.on_off',
      instance: 'powerSwitch',
      value: 0,
    });
  }

  async setBrightness(device: string, model: string, brightness: number): Promise<boolean> {
    return this.controlDevice(device, model, {
      type: 'devices.capabilities.range',
      instance: 'brightness',
      value: Math.max(1, Math.min(100, brightness)),
    });
  }

  async setColor(device: string, model: string, r: number, g: number, b: number): Promise<boolean> {
    return this.controlDevice(device, model, {
      type: 'devices.capabilities.color_setting',
      instance: 'colorRgb',
      value: {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b)),
      },
    });
  }

  async setColorTemperature(device: string, model: string, temperature: number): Promise<boolean> {
    return this.controlDevice(device, model, {
      type: 'devices.capabilities.color_setting',
      instance: 'colorTemperatureK',
      value: Math.max(2000, Math.min(9000, temperature)),
    });
  }

  async getScenarios(): Promise<any[]> {
    const response = await this.request<{ scenarios: any[] }>('/scenes');
    if (response.code === 200 && response.data) {
      return (response.data as any).scenarios || [];
    }
    return [];
  }

  async runScenario(scenarioId: string): Promise<boolean> {
    const response = await this.request<any>(
      '/scenes/run',
      'POST',
      {
        scene: scenarioId,
      }
    );
    return response.code === 200;
  }
}

