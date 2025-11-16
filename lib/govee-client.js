/**
 * Govee API Client Module
 * Fetch interceptor ve API fonksiyonlarını içerir
 */

const crypto = require('crypto');

const BASE_URL = 'https://openapi.api.govee.com/router/api/v1';

// UUID generator - Node.js için crypto modülünü kullan
function generateRequestId() {
  // Node.js 14.17.0+ için crypto.randomUUID kullan
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: crypto.randomBytes ile UUID v4 oluştur
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.randomBytes(1)[0] % 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Fetch interceptor - tüm request'lere requestId ekler
function createFetchInterceptor(apiKey) {
  const originalFetch = globalThis.fetch;
  
  const interceptedFetch = async (url, options = {}) => {
    const requestId = generateRequestId();
    
    // URL'i parse et
    const urlObj = typeof url === 'string' ? new URL(url) : url;
    
    // Options'ı kopyala
    const interceptedOptions = { ...options };
    
    // Headers'ı hazırla
    const headers = new Headers(interceptedOptions.headers || {});
    
    // API Key'i header'a ekle
    headers.set('Govee-API-Key', apiKey);
    headers.set('Content-Type', 'application/json');
    
    // POST request ise body'ye requestId ekle
    if (interceptedOptions.method === 'POST' || interceptedOptions.method === 'PUT' || interceptedOptions.method === 'PATCH') {
      try {
        let body = interceptedOptions.body;
        
        // Eğer body string ise JSON'a parse et
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (e) {
            // JSON değilse olduğu gibi bırak
          }
        }
        
        // Eğer body object ise requestId ekle
        if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
          body = {
            requestId,
            ...body,
          };
          interceptedOptions.body = JSON.stringify(body);
        } else if (!body) {
          // Body yoksa sadece requestId ekle
          interceptedOptions.body = JSON.stringify({ requestId });
        }
      } catch (error) {
        console.warn('RequestId eklenirken hata:', error.message);
      }
    } else {
      // GET request'ler için query parameter olarak ekle
      urlObj.searchParams.set('requestId', requestId);
    }
    
    // Request ID'yi header'a da ekle (opsiyonel, debugging için)
    headers.set('X-Request-ID', requestId);
    
    interceptedOptions.headers = headers;
    
    // Debug için log (opsiyonel)
    if (process.env.DEBUG) {
      console.log(`[Request] ${interceptedOptions.method || 'GET'} ${urlObj.toString()}`);
      console.log(`[Request ID] ${requestId}`);
    }
    
    // Original fetch'i çağır
    return originalFetch(urlObj.toString(), interceptedOptions);
  };
  
  return interceptedFetch;
}

class GoveeClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key gerekli');
    }
    this.apiKey = apiKey;
    this.fetch = createFetchInterceptor(apiKey);
  }

  async fetchDevices() {
    try {
      const response = await this.fetch(`${BASE_URL}/user/devices`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.code !== 200) {
        throw new Error(`API Hatası: ${data.message} (Code: ${data.code})`);
      }

      return data.data || [];
    } catch (error) {
      console.error('Cihazlar alınırken hata:', error.message);
      throw error;
    }
  }

  async fetchDeviceState(device, sku) {
    try {
      const response = await this.fetch(
        `${BASE_URL}/device/state?device=${encodeURIComponent(device)}&model=${encodeURIComponent(sku)}`,
        {
          method: 'GET',
        }
      );

      const data = await response.json();

      if (data.code !== 200) {
        // Bazı cihazlar state döndürmeyebilir, bu durumda null döndür
        return null;
      }

      return data.data;
    } catch (error) {
      // State alınamazsa null döndür
      return null;
    }
  }

  async fetchDeviceDetails(device, sku) {
    // Önce cihaz listesini al
    const devices = await this.fetchDevices();
    const deviceInfo = devices.find((d) => d.device === device && d.sku === sku);
    
    if (!deviceInfo) {
      return null;
    }

    // Sonra state bilgisini al
    const state = await this.fetchDeviceState(device, sku);

    return {
      ...deviceInfo,
      state: state || null,
    };
  }

  async controlDevice(device, sku, capability) {
    try {
      const response = await this.fetch(`${BASE_URL}/device/control`, {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            sku,
            device,
            capability,
          },
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cihaz kontrolünde hata:', error.message);
      throw error;
    }
  }

  async turnOn(device, sku) {
    return this.controlDevice(device, sku, {
      type: 'devices.capabilities.on_off',
      instance: 'powerSwitch',
      value: 1,
    });
  }

  async turnOff(device, sku) {
    return this.controlDevice(device, sku, {
      type: 'devices.capabilities.on_off',
      instance: 'powerSwitch',
      value: 0,
    });
  }

  createMqttClient() {
    try {
      // MQTT paketini dinamik olarak yükle
      const mqtt = require('mqtt');
      
      const emqxUrl = 'mqtt.openapi.govee.com';
      const options = {
        clean: true,
        username: this.apiKey,
        password: this.apiKey,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
      };

      const connectUrl = `mqtts://${emqxUrl}`;
      const client = mqtt.connect(connectUrl, options);

      client.on('connect', () => {
        // Dokümantasyona göre topic: "GA/[API-Key]" formatında
        // Ancak örnek kodda sadece apiKey kullanılıyor, her ikisini de deneyelim
        const topicGA = `GA/${this.apiKey}`;
        const topicApiKey = this.apiKey;
        
        // Her iki topic'e de subscribe et
        client.subscribe(topicGA, (err) => {
          if (err) {
            console.error(`MQTT subscribe hatası (${topicGA}):`, err);
          } else if (process.env.DEBUG) {
            console.log(`MQTT subscribed to topic: ${topicGA}`);
          }
        });
        
        client.subscribe(topicApiKey, (err) => {
          if (err) {
            console.error(`MQTT subscribe hatası (${topicApiKey}):`, err);
          } else if (process.env.DEBUG) {
            console.log(`MQTT subscribed to topic: ${topicApiKey}`);
          }
        });
      });

      return client;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('mqtt paketi bulunamadı. Lütfen "npm install mqtt" komutunu çalıştırın.');
      }
      throw error;
    }
  }
}

module.exports = { GoveeClient, generateRequestId };

