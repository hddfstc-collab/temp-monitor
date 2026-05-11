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
  console.log(`[${new Date().toLocaleTimeString()}] 전 구역 데이터 수집 시작...`);

  // DB에 등록된 모든 기기 리스트를 가져옵니다.
  const snapshot = await db.ref('devices').once('value');
  const devices = snapshot.val();

  if (!devices) {
    console.log("등록된 기기가 없습니다. 웹에서 먼저 기기를 추가해주세요.");
    return;
  }

  for (const deviceId in devices) {
    const device = devices[deviceId];
    try {
      const status = await context.request({
        path: `/v1.0/iot-03/devices/${deviceId}/status`,
        method: 'GET',
      });

      if (status.success) {
        let currentTemp = 0;
        let currentHumi = 0;

        status.result.forEach(item => {
          if (item.code === 'va_temperature') currentTemp = item.value / 10;
          if (item.code === 'va_humidity') currentHumi = item.value;
        });

        const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const timestamp = Date.now();

        // 실시간 데이터 업데이트 (이름/구역은 유지하고 값만 업데이트)
        await db.ref(`devices/${deviceId}`).update({
          temperature: currentTemp,
          humidity: currentHumi,
          lastUpdated: currentTime
        });

        // 엑셀용 히스토리 저장
        await db.ref(`history/${deviceId}/${timestamp}`).set({
          name: device.name || '미설정',
          zone: device.zone || '미지정',
          temperature: currentTemp,
          humidity: currentHumi,
          time: currentTime
        });

        console.log(`✅ [${device.zone}] ${device.name} -> ${currentTemp}°C`);
      }
    } catch (error) {
      console.error(`⚠️ ${deviceId} 통신 에러:`, error.message);
    }
  }
}

// 10분마다 자동 실행
collectAndSaveData();
setInterval(collectAndSaveData, 600000);