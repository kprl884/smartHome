#!/usr/bin/env node

/**
 * Minimal Node.js script to fetch Govee lights and their states
 * Usage: node fetch-lights.js
 * 
 * API key'i .env dosyasından veya GOVEE_API_KEY environment variable'ından okur
 */

// .env dosyasını yükle (eğer varsa)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv yoksa manuel olarak .env dosyasını oku
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  } catch (err) {
    // .env okunamazsa devam et
  }
}

const API_KEY = process.env.GOVEE_API_KEY || process.argv[2];

if (!API_KEY) {
  console.error('Hata: API key bulunamadı!');
  console.error('Lütfen şu yöntemlerden birini kullanın:');
  console.error('  1. .env dosyasına GOVEE_API_KEY=your-key ekleyin');
  console.error('  2. Environment variable olarak: export GOVEE_API_KEY=your-key');
  console.error('  3. Komut satırından: node fetch-lights.js your-api-key');
  process.exit(1);
}

const BASE_URL = 'https://openapi.api.govee.com/router/api/v1';

// UUID generator - Node.js için crypto modülünü kullan
const crypto = require('crypto');

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
const originalFetch = globalThis.fetch;
const interceptedFetch = async (url, options = {}) => {
  const requestId = generateRequestId();
  
  // URL'i parse et
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  
  // Options'ı kopyala
  const interceptedOptions = { ...options };
  
  // Headers'ı hazırla
  const headers = new Headers(interceptedOptions.headers || {});
  
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

// Global fetch'i override et
globalThis.fetch = interceptedFetch;

async function fetchDevices() {
  try {
    const response = await fetch(`${BASE_URL}/user/devices`, {
      method: 'GET',
      headers: {
        'Govee-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
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

async function fetchDeviceState(device, sku) {
  try {
    // Device state endpoint - dokümantasyonda tam detay yok ama genel API yapısına göre
    const response = await fetch(
      `${BASE_URL}/device/state?device=${encodeURIComponent(device)}&model=${encodeURIComponent(sku)}`,
      {
        method: 'GET',
        headers: {
          'Govee-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
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

async function main() {
  console.log('Govee cihazları alınıyor...\n');

  try {
    const devices = await fetchDevices();

    if (devices.length === 0) {
      console.log('Hiç cihaz bulunamadı.');
      return;
    }

    console.log(`Toplam ${devices.length} cihaz bulundu.\n`);

    // Sadece ışık cihazlarını filtrele (opsiyonel - tüm cihazları görmek isterseniz kaldırın)
    const lights = devices.filter((device) => {
      // Capabilities'e bakarak ışık olup olmadığını kontrol et
      return device.capabilities?.some(
        (cap) =>
          cap.type === 'devices.capabilities.on_off' ||
          cap.type === 'devices.capabilities.color_setting' ||
          cap.type === 'devices.capabilities.range'
      );
    });

    console.log(`Işık cihazları: ${lights.length}\n`);

    // Her cihaz için durum bilgisini al
    for (const device of lights) {
      const deviceName = device.deviceName || device.device;
      console.log(`📱 ${deviceName}`);
      console.log(`   Model: ${device.sku}`);
      console.log(`   Device ID: ${device.device}`);

      // Capabilities bilgilerini göster
      if (device.capabilities && device.capabilities.length > 0) {
        const capabilities = device.capabilities.map((cap) => cap.type).join(', ');
        console.log(`   Özellikler: ${capabilities}`);
      }

      // State bilgisini al (eğer cihaz state döndürebiliyorsa)
      const state = await fetchDeviceState(device.device, device.sku);

      if (state && state.properties && state.properties.length > 0) {
        const props = state.properties[0];
        console.log(`   Durum:`);
        if (props.powerState) {
          console.log(`     - Açık/Kapalı: ${props.powerState}`);
        }
        if (props.brightness !== undefined) {
          console.log(`     - Parlaklık: ${props.brightness}%`);
        }
        if (props.color) {
          console.log(
            `     - Renk: RGB(${props.color.r}, ${props.color.g}, ${props.color.b})`
          );
        }
        if (props.colorTem !== undefined) {
          console.log(`     - Renk Sıcaklığı: ${props.colorTem}K`);
        }
      } else {
        console.log(`   Durum: Alınamadı veya desteklenmiyor`);
      }

      console.log('');
    }

    // JSON formatında da çıktı ver (opsiyonel)
    console.log('\n--- JSON Formatında ---\n');
    console.log(JSON.stringify(lights, null, 2));
  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
}

main();

