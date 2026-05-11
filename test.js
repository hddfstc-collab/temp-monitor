// 1. 렌더 서버 응답 체크용 서버
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Engine is running');
}).listen(process.env.PORT || 10000);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 2. 파이어베이스 설정
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
});
const db = admin.database();

// 3. 투야 설정
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID,
  secretKey: process.env.TUYA_SECRET_KEY,
});

// 4. 변화 감지 수집 함수
async function collectAndSaveData() {
  console.log(`[${new Date().toLocaleString()}] 데이터 수집 시도 중...`);
  try {
    const snapshot = await db.ref('devices').once('value');
    const devices = snapshot.val();
    if (!devices) return;

    for (const deviceId in devices) {
      const device = devices[deviceId];
      const status = await context.request({
        path: `/v1.0/iot-03/devices/${deviceId}/status`,
        method: 'GET',
      });

      if (status.success) {
        let currentTemp = 0; let currentHumi = 0;
        status.result.forEach(item => {
          if (item.code === 'va_temperature') currentTemp = item.value / 10;
          if (item.code === 'va_humidity') currentHumi = item.value;
        });

        // 🚨 변화 감지 로직
        const lastTemp = device.temperature;
        const lastHumi = device.humidity;

        // 온도나 습도가 단 0.1이라도 변했다면 저장
        if (lastTemp !== currentTemp || lastHumi !== currentHumi) {
          const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const timestamp = Date.now();

          // 현재 상태 업데이트 (다음 비교를 위해)
          await db.ref(`devices/${deviceId}`).update({
            temperature: currentTemp, humidity: currentHumi, lastUpdated: currentTime
          });

          // 히스토리 기록
          await db.ref(`history/${deviceId}/${timestamp}`).set({
            name: device.name, zone: device.zone,
            temperature: currentTemp, humidity: currentHumi, time: currentTime
          });
          console.log(`✨ [${device.zone}] 변화 감지! 기록함: ${currentTemp}°C / ${currentHumi}%`);
        } else {
          console.log(`😴 [${device.zone}] 변화 없음 (기록 생략)`);
        }
      }
    }
  } catch (e) {
    console.error("수집 중 에러 발생:", e.message);
  }
}

// 5. 실행 (10분 주기는 유지하되, 변화 없으면 저장만 안 함)
collectAndSaveData();
setInterval(collectAndSaveData, 600000);
