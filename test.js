// 1. 렌더(Render) 서버 응답 체크용 가짜 웹 서버
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Engine is running');
}).listen(process.env.PORT || 10000);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 2. 파이어베이스 설정 (환경 변수 사용)
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

// 4. 데이터 수집 및 변화 감지 함수
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
        let currentTemp = 0; 
        let currentHumi = 0; 
        let currentBattery = 0;

        // 투야 데이터에서 온도, 습도, 배터리 값 추출
        status.result.forEach(item => {
          if (item.code === 'va_temperature') currentTemp = item.value / 10;
          if (item.code === 'va_humidity') currentHumi = item.value;
          if (item.code === 'battery_percentage') currentBattery = item.value;
        });

        // 이전 데이터와 비교 (하나라도 변하면 저장)
        const hasChanged = 
          device.temperature !== currentTemp || 
          device.humidity !== currentHumi || 
          device.battery !== currentBattery;

        if (hasChanged) {
          const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          const timestamp = Date.now();

          // 실시간 상태 업데이트
          await db.ref(`devices/${deviceId}`).update({
            temperature: currentTemp,
            humidity: currentHumi,
            battery: currentBattery,
            lastUpdated: currentTime
          });

          // 히스토리 기록
          await db.ref(`history/${deviceId}/${timestamp}`).set({
            name: device.name,
            zone: device.zone,
            temperature: currentTemp,
            humidity: currentHumi,
            battery: currentBattery,
            time: currentTime
          });
          console.log(`✨ [${device.zone}] 변화 감지 기록 완료: ${currentTemp}°C / 배터리: ${currentBattery}%`);
        } else {
          console.log(`😴 [${device.zone}] 변화 없음 (기록 생략)`);
        }
      }
    }
  } catch (e) {
    console.error("수집 중 에러 발생:", e.message);
  }
}

// 5. 엔진 실행 (10분마다 반복)
collectAndSaveData();
setInterval(collectAndSaveData, 600000);
