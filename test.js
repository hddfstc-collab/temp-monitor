process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 1. 파이어베이스 설정 (환경 변수 FIREBASE_SERVICE_ACCOUNT를 직접 읽음)
// 🚨 이 부분이 파일 대신 환경 변수를 사용하도록 수정된 핵심입니다.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
});
const db = admin.database();

// 2. 투야 설정 (환경 변수 사용)
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID,
  secretKey: process.env.TUYA_SECRET_KEY,
});

// 3. 데이터 수집 함수
async function collectAndSaveData() {
  console.log(`[${new Date().toLocaleString()}] 데이터 수집 시도 중...`);
  try {
    const snapshot = await db.ref('devices').once('value');
    const devices = snapshot.val();
    if (!devices) {
      console.log("등록된 기기가 없습니다.");
      return;
    }

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

        const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const timestamp = Date.now();

        await db.ref(`devices/${deviceId}`).update({
          temperature: currentTemp, humidity: currentHumi, lastUpdated: currentTime
        });

        await db.ref(`history/${deviceId}/${timestamp}`).set({
          name: device.name, zone: device.zone,
          temperature: currentTemp, humidity: currentHumi, time: currentTime
        });
        console.log(`✅ [${device.zone}] ${device.name} 수집 완료: ${currentTemp}°C / ${currentHumi}%`);
      }
    }
  } catch (e) {
    console.error("수집 중 에러 발생:", e.message);
  }
}

// 실행
collectAndSaveData();
setInterval(collectAndSaveData, 600000); // 10분마다 실행
