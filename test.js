// 1. 렌더(Render) 서버의 응답 체크를 통과하기 위한 가짜 웹 서버 (필수!)
// 이 코드가 없으면 렌더가 "서비스 응답 없음"으로 간주하고 강제로 종료시킵니다.
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Engine is running');
}).listen(process.env.PORT || 10000);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 2. 파이어베이스 설정 (환경 변수 FIREBASE_SERVICE_ACCOUNT를 직접 읽음)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
});
const db = admin.database();

// 3. 투야 설정 (환경 변수 사용)
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: process.env.TUYA_ACCESS_ID,
  secretKey: process.env.TUYA_SECRET_KEY,
});

// 4. 데이터 수집 함수
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

// 5. 실행
collectAndSaveData();
setInterval(collectAndSaveData, 600000); // 10분마다 실행
