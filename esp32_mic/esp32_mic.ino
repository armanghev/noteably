#include <Arduino.h>
#include <SD.h>
#include <SPI.h>
#include <driver/i2s.h>

#include <HTTPClient.h>
#include <WiFi.h>

// PIN CONFIGURATION
#define SD_CS 15
#define BUTTON_PIN 33
#define I2S_WS 26
#define I2S_SD 32
#define I2S_SCK 27
#define LED_READY 12
#define LED_REC 13

#define SAMPLE_RATE 16000
#define I2S_PORT I2S_NUM_0

// NETWORK CONFIGURATION
const char *ssid = "SpectrumSetup-BC0F";
const char *password = "slightwinner292";
const char *apiKey = "sk_MRxVuLl6.WvPXFZef7UTZopzHhRmYc1L0LH8q2huggnTL6EQd5q4";
const char *serverUrl = "http://192.168.1.42:8000/api/process";

File audioFile;
bool isRecording = false;
bool lastButtonState = HIGH;

// Write buffer
#define WRITE_BUF_SAMPLES 4096
int16_t writeBuf[WRITE_BUF_SAMPLES];
int writeBufIdx = 0;

void i2sInit() {
  i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
      .sample_rate = SAMPLE_RATE,
      .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
      .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
      .communication_format =
          (i2s_comm_format_t)(I2S_COMM_FORMAT_I2S | I2S_COMM_FORMAT_I2S_MSB),
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
      .dma_buf_count = 4,
      .dma_buf_len = 1024,
      .use_apll = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk = 0};

  i2s_pin_config_t pin_config = {.bck_io_num = I2S_SCK,
                                 .ws_io_num = I2S_WS,
                                 .data_out_num = I2S_PIN_NO_CHANGE,
                                 .data_in_num = I2S_SD};

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
}

void writeWavHeader(File &file, uint32_t dataSize) {
  uint32_t sampleRate = SAMPLE_RATE;
  uint16_t channels = 1;
  uint16_t bitsPerSample = 16;
  uint32_t byteRate = sampleRate * channels * bitsPerSample / 8;
  uint16_t blockAlign = channels * bitsPerSample / 8;

  file.seek(0);
  file.write((const uint8_t*)"RIFF", 4);
  uint32_t chunkSize = 36 + dataSize;
  file.write((uint8_t*)&chunkSize, 4);
  file.write((const uint8_t*)"WAVE", 4);
  file.write((const uint8_t*)"fmt ", 4);
  uint32_t subchunk1Size = 16;
  file.write((uint8_t*)&subchunk1Size, 4);
  uint16_t audioFormat = 1;
  file.write((uint8_t*)&audioFormat, 2);
  file.write((uint8_t*)&channels, 2);
  file.write((uint8_t*)&sampleRate, 4);
  file.write((uint8_t*)&byteRate, 4);
  file.write((uint8_t*)&blockAlign, 2);
  file.write((uint8_t*)&bitsPerSample, 2);
  file.write((const uint8_t*)"data", 4);
  file.write((uint8_t*)&dataSize, 4);
}

void startRecording() {
  audioFile = SD.open("/recording.wav", FILE_WRITE);
  if (!audioFile) {
    Serial.println("Failed to open file");
    return;
  }

  uint8_t header[44] = {0};
  audioFile.write(header, 44);

  writeBufIdx = 0;
  isRecording = true;

  Serial.println("Recording...");
  digitalWrite(LED_READY, LOW);
  digitalWrite(LED_REC, HIGH);
}

void uploadAudio() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  Serial.println("Starting upload...");
  File file = SD.open("/recording.wav", FILE_READ);
  if (!file) {
    Serial.println("Failed to open file for reading");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);

  // Create a unique boundary
  String boundary = "------------------------ESP32Boundary" + String(millis());

  http.addHeader("Authorization", String("Bearer ") + apiKey);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  // Construct the multipart body parts specifically
  String head =
      "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"material_types\"\r\n\r\n" +
      "[\"summary\", \"notes\", \"flashcards\", \"quizzes\"]\r\n" + "--" +
      boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"options\"\r\n\r\n" + "{}\r\n" +
      "--" + boundary + "\r\n" +
      "Content-Disposition: form-data; name=\"file\"; "
      "filename=\"recording.wav\"\r\n" +
      "Content-Type: audio/wav\r\n\r\n";

  String tail = "\r\n--" + boundary + "--\r\n";

  // Calculate total length
  size_t fileLen = file.size();
  size_t totalLen = head.length() + fileLen + tail.length();

  // Since HTTPClient.POST(stream, size) sends the stream directly as body,
  // we cannot easily wrap it with head/tail without a custom Stream class or
  // large buffer. Ideally we use WiFiClient directly, but for simplicity with
  // HTTPClient, we will try to use the low-level collect/send if available, or
  // just fail back to the chunked logic if header allows.

  // Actually, standard HTTPClient doesn't support multipart stream wrapping
  // easily. We will switch to using the underlying WiFiClient for the POST to
  // enable streaming.
  http.end(); // close the HTTPClient, we'll do it manually.

  // Parse URL to get host and port
  String url = String(serverUrl);
  int protocolEnd = url.indexOf("://");
  String protocol = url.substring(0, protocolEnd);
  int pathStart = url.indexOf('/', protocolEnd + 3);
  String host = url.substring(protocolEnd + 3, pathStart);
  int port = 80;

  int portColon = host.indexOf(':');
  if (portColon > 0) {
    port = host.substring(portColon + 1).toInt();
    host = host.substring(0, portColon);
  } else if (protocol == "https") {
    port = 443;
  }
  String path = url.substring(pathStart);

  WiFiClient client;
  if (!client.connect(host.c_str(), port)) {
    Serial.println("Connection failed");
    file.close();
    return;
  }

  // Send Headers
  client.println("POST " + path + " HTTP/1.1");
  client.println("Host: " + host);
  client.println("Authorization: Bearer " + String(apiKey));
  client.println("Content-Type: multipart/form-data; boundary=" + boundary);
  client.println("Content-Length: " + String(totalLen));
  client.println("Connection: close");
  client.println(); // End headers

  // Send Body
  client.print(head);

  // Stream file in chunks
  uint8_t buf[1024];
  while (file.available()) {
    size_t len = file.read(buf, sizeof(buf));
    client.write(buf, len);
  }

  client.print(tail);

  // Read Response
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r")
      break; // Headers finished
    // Serial.println(line);
  }

  String responseBody = client.readString();
  Serial.println("Upload Complete!");
  Serial.println("Response: " + responseBody);

  file.close();
  client.stop();
}

void stopRecording() {
  isRecording = false;

  if (writeBufIdx > 0) {
    audioFile.write((uint8_t*)writeBuf, writeBufIdx * 2);
  }

  uint32_t dataSize = audioFile.size() - 44;
  writeWavHeader(audioFile, dataSize);
  audioFile.close();

  Serial.println("Stopped");
  digitalWrite(LED_READY, HIGH);
  digitalWrite(LED_REC, LOW);

  // Trigger upload
  uploadAudio();
}

void recordAudio() {
  int32_t samples[512];
  size_t bytesRead = 0;

  i2s_read(I2S_PORT, samples, sizeof(samples), &bytesRead, portMAX_DELAY);
  int samplesRead = bytesRead / 4;

  // Debug
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 500) {
    int32_t maxVal = 0;
    int32_t minVal = 0;
    for (int i = 0; i < samplesRead; i++) {
      if (samples[i] > maxVal) maxVal = samples[i];
      if (samples[i] < minVal) minVal = samples[i];
    }
    Serial.print("Min: ");
    Serial.print(minVal);
    Serial.print(" Max: ");
    Serial.println(maxVal);
    lastPrint = millis();
  }

  for (int i = 0; i < samplesRead; i++) {
    // Take upper 16 bits of 32-bit sample
    int16_t sample = (samples[i] >> 16);

    writeBuf[writeBufIdx++] = sample;

    if (writeBufIdx >= WRITE_BUF_SAMPLES) {
      audioFile.write((uint8_t*)writeBuf, WRITE_BUF_SAMPLES * 2);
      writeBufIdx = 0;
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_READY, OUTPUT);
  pinMode(LED_REC, OUTPUT);

  digitalWrite(LED_READY, HIGH);
  digitalWrite(LED_REC, LOW);

  Serial.println("SD init...");
  if (!SD.begin(SD_CS)) {
    Serial.println("SD fail");
    while (1);
  }
  Serial.print("SD OK - ");
  Serial.print(SD.cardSize() / (1024 * 1024));
  Serial.println(" MB");

  i2sInit();
  Serial.println("Ready - press button to record");

  // WiFi Init
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi Connection Failed. Uploads will fail.");
  }
}

void loop() {
  bool buttonState = digitalRead(BUTTON_PIN);

  if (lastButtonState == HIGH && buttonState == LOW) {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
    delay(300);
  }
  lastButtonState = buttonState;

  if (isRecording) {
    recordAudio();
  }
}
