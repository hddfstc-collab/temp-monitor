process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 1. 파이어베이스 설정
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
});
const db = admin.database();

// 2. 투야 설정
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

// 3. 데이터 수집 핵심 함수
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

        // 🚨 이전 데이터와 비교 로직 추가
        const lastTemp = device.temperature;
        const lastHumi = device.humidity;

        // 온도나 습도 중 하나라도 변했으면 저장
        if (lastTemp !== currentTemp || lastHumi !== currentHumi) {
          const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const timestamp = Date.now();

          // 최신 상태 업데이트
          await db.ref(`devices/${deviceId}`).update({
            temperature: currentTemp, humidity: currentHumi, lastUpdated: currentTime
          });

          // 히스토리에 기록 (변화가 있을 때만!)
          await db.ref(`history/${deviceId}/${timestamp}`).set({
            name: device.name, zone: device.zone,
            temperature: currentTemp, humidity: currentHumi, time: currentTime
          });
          console.log(`✨ [${device.zone}] 데이터 변화 감지! 기록 완료: ${currentTemp}°C`);
        } else {
          console.log(`😴 [${device.zone}] 온도 변화 없음 (기록 생략)`);
        }
      }
    }
  } catch (e) {
    console.error("수집 중 에러 발생:", e.message);
  }
}

// 10분마다 자동 실행
collectAndSaveData();
setInterval(collectAndSaveData, 600000);
