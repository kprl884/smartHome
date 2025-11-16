# SmartHome

macOS menü çubuğu uygulaması - Govee ışıklarını ve cihazlarını yönetmek için.

## Özellikler

- ✅ Cihaz listesi ve durum takibi
- ✅ Cihaz açma/kapama kontrolü (toggle switch)
- ✅ Renk seçimi (RGB color picker ve preset renkler)
- ✅ Parlaklık kontrolü (slider)
- ✅ Senaryo yönetimi ve çalıştırma
- ✅ Zamanlayıcılar (belirli saatlerde aç/kapa)
- ✅ Cihaz grupları ile toplu kontrol
- ✅ MQTT entegrasyonu ile gerçek zamanlı durum güncellemeleri
- ✅ Demo cihazlar ile test ve geliştirme desteği
- ✅ Modern ve kullanıcı dostu arayüz
- ✅ Scroll edilebilir cihaz listesi
- ✅ Menü bar menüsü ve çıkış seçeneği

## Kurulum

1. Repository'yi klonlayın:
```bash
git clone <repository-url>
cd smarthome
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Govee API anahtarınızı `.env` dosyasına ekleyin:
```bash
echo "GOVEE_API_KEY=your-api-key-here" > .env
```

**Not:** `.env` dosyası `.gitignore` içinde olduğu için git'e commit edilmeyecektir.

4. Uygulamayı derleyin:
```bash
npm run build
```

5. Uygulamayı çalıştırın:
```bash
npm start
```

## Geliştirme

Geliştirme modunda çalıştırmak için (DevTools ile):
```bash
npm run electron:dev
```

Watch modunda TypeScript derlemesi için:
```bash
npm run dev
```

## Paketleme

macOS için DMG dosyası oluşturmak için:
```bash
npm run dist:mac
```

Tüm platformlar için:
```bash
npm run dist
```

## Govee API Key

Uygulamayı kullanmak için Govee API anahtarına ihtiyacınız var:

1. Govee Home uygulamasını açın
2. Hesap sayfasına gidin (sağ alt köşedeki kişi simgesi)
3. Sağ üst köşedeki dişli simgesine tıklayın
4. "API Anahtarı Başvurusu" seçeneğini seçin ve formu doldurun
5. API anahtarınızı aldıktan sonra:
   - `.env` dosyasına ekleyin: `GOVEE_API_KEY=your-api-key`
   - Veya uygulamadaki ayarlar bölümünden girin

**Güvenlik:** API anahtarınızı asla git repository'ye commit etmeyin. `.env` dosyası zaten `.gitignore` içindedir.

## Demo Cihazlar

Uygulama, gerçek cihazlarınız olmasa bile test edebilmeniz için demo cihazlar içerir:
- Oturma Odası Işığı (renk ve parlaklık kontrolü)
- Yatak Odası Işığı (renk ve parlaklık kontrolü)
- Mutfak Işığı (sadece parlaklık kontrolü)
- Çalışma Odası Işığı (renk ve parlaklık kontrolü)

Demo cihazlar her zaman gösterilir ve tüm kontroller çalışır (local state'te tutulur).

## Kullanım

### Menü Bar Menüsü
- Menü bar ikonuna **sağ tıklayın** → Context menü açılır
- **Ayarlar**: Pencereyi açar ve ayarlar panelini gösterir
- **Çıkış**: Uygulamayı kapatır

### Ayarlar Paneli
- Header'daki ⚙️ butonuna tıklayarak ayarlar panelini açabilirsiniz
- API anahtarınızı buradan girebilir veya güncelleyebilirsiniz
- **Çıkış** butonu ile uygulamadan çıkabilirsiniz

### Cihaz Kontrolü
- **Toggle Switch**: Cihazı aç/kapa
- **Parlaklık Slider**: Parlaklığı ayarla (1-100%)
- **Renk Seçici**: RGB renk seçimi
- **Renk Preset'leri**: Hızlı renk seçimi için preset butonları

## Testler

Native Node.js test runner kullanarak end-to-end testler çalıştırılabilir:

```bash
npm test
```

Watch modunda test çalıştırmak için:
```bash
npm run test:watch
```

Testler şunları kontrol eder:
- Tüm cihazları fetch etme
- Her cihaz için state bilgisini fetch etme
- Device details (device info + state) fetch etme
- Invalid device handling
- Request ID interceptor'ın çalışması
- Işık cihazlarını filtreleme
- Cihaz açma/kapama kontrolü
- MQTT entegrasyonu ile gerçek zamanlı durum güncellemeleri

## Proje Yapısı

```
smarthome/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # UI (HTML, CSS, TypeScript)
│   └── api/            # Govee API client
├── lib/                # Node.js API client (testler için)
├── tests/              # End-to-end testler
├── dist/               # Derlenmiş dosyalar (gitignore)
└── docs/               # API dokümantasyonu
```

## Teknolojiler

- **Electron** - Cross-platform desktop uygulama framework
- **TypeScript** - Type-safe JavaScript
- **Govee Cloud API** - Cihaz kontrolü ve durum takibi
- **MQTT** - Gerçek zamanlı cihaz durum güncellemeleri
- **menubar** - macOS menü bar uygulaması wrapper
- **Node.js Test Runner** - Native test framework

## Güvenlik Notları

- API anahtarınızı `.env` dosyasında saklayın
- `.env` dosyası `.gitignore` içindedir ve commit edilmeyecektir
- API anahtarınızı asla public repository'lere yüklemeyin
- Uygulama içinde API anahtarı localStorage'da saklanır (sadece local)

## Lisans

MIT
