/**
 * === FILE: esp32_code.ino ===
 * NeuroType - ESP32 firmware for acquisition of EOG + EEG from Adafruit ADS1115.
 * Broadcasts real-time signals via WebSocket on port 81 at ~500Hz.
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <Adafruit_ADS1X15.h>
#include <ArduinoJson.h> // Sử dụng bảng JSON để tuần tự hóa dữ liệu gửi nhanh

// Khai báo prototype thủ công để giải quyết lỗi bộ tiền xử lý tự động của Arduino IDE
void webSocketEvent(uint8_t num, WSevent_t type, uint8_t * payload, size_t length);

// Cấu hình mạng WiFi (Sinh viên / Người dùng điều chỉnh thông số này)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Khởi tạo máy chủ WebSocket tại cổng 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Khởi tạo bộ chuyển đổi tương tự-số ADS1115 (Địa chỉ I2C mặc định 0x48)
Adafruit_ADS1115 ads;

// Bộ đếm thời gian gửi mẫu để kiểm soát tần số lấy mẫu lý tưởng
unsigned long lastSampleTime = 0;
const int sampleIntervalMs = 2; // Khoảng cách 2ms tương đương tần số lấy mẫu ~500Hz

void webSocketEvent(uint8_t num, WSevent_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WSevent_DISCONNECTED:
      Serial.printf("[%u] Thiết bị thu thập đã ngắt kết nối WebSocket.\n", num);
      break;
    case WSevent_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Thiết bị nhận dữ liệu đã kết nối từ IP: %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      break;
    }
    case WSevent_TEXT:
      // Không xử lý gửi lệnh ngược trừ phi cần hiệu chuẩn
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[NeuroType] Bắt đầu khởi động thiết bị đầu cuối ESP32...");

  // 1. Kết nối mạng WiFi
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Đang kết nối mạng");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Đã kết nối mạng WiFi thành công!");
  Serial.print("[WiFi] Địa chỉ IP nội bộ của ESP32: ");
  Serial.println(WiFi.localIP());

  // 2. Khởi tạo WebSocket Server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("[WebSocket] Khởi chạy máy chủ tại cổng 81 thành công.");

  // 3. Khởi tạo cấu hình kênh Analog ADS1115
  if (!ads.begin()) {
    Serial.println("[ADS1115] LỖI: Không tìm thấy chíp ADS1115 I2C! Hãy kiểm tra dây nối sườn.");
    while (1);
  }
  
  // Thiết lập hệ số khuếch đại (Gain):
  // GAIN_TWO: Dải đo tối đa +/- 2.048V (1 bit = 0.0625mV), tối ưu cho dải EOG/EEG đã khuếch đại nhẹ
  ads.setGain(GAIN_TWO);
  
  // Thiết lập tốc độ chuyển đổi dữ liệu analog (Data Rate):
  // RATE_ADS1115_475SPS: Đảm bảo chuyển đổi nhanh gần mức tần số 500Hz tiêu chuẩn
  ads.setDataRate(RATE_ADS1115_475SPS);
  
  Serial.println("[ADS1115] Thiết lập ADC thành công: Gain = TWO, 475 SPS.");
}

void loop() {
  // Liên tục xử lý duy trì luồng kết nối WebSocket
  webSocket.loop();

  // Đọc tín hiệu và phát tán đi với tần số định dạng 500Hz (~mỗi 2ms)
  unsigned long currentTime = millis();
  if (currentTime - lastSampleTime >= sampleIntervalMs) {
    lastSampleTime = currentTime;

    // Đọc điện thế đơn cực từ các kênh:
    // Kênh A0 (Đầu vào EEG tháp trán / sau tai)
    // Kênh A1 (Đầu vào EOG chuyển động ngang mắt Trái / Phải)
    int16_t eeg_raw = ads.readADC_SingleEnded(0);
    int16_t eog_raw = ads.readADC_SingleEnded(1);

    // Xây dựng chuỗi JSON tinh gọn để tối ưu băng thông truyền dẫn không dây
    // Định dạng gửi mong muốn: {"t": timestamp_ms, "e": eog, "b": eeg}
    StaticJsonDocument<128> doc;
    doc["t"] = currentTime;
    doc["e"] = eog_raw;
    doc["b"] = eeg_raw;

    String jsonString;
    serializeJson(doc, jsonString);

    // Gửi quảng bá dữ liệu thời gian thực tới tất cả các thiết bị đang nghe (ví dụ máy tính chạy Python)
    webSocket.broadcastTXT(jsonString);
  }
}
