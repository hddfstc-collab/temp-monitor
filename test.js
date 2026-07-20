const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const serviceAccount = { /* 기존 설정 내용 유지 */ };

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = getDatabase();
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

async function collect() {
  const now = new Date();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  try {
    const snapshot = await db.ref('devices').once('value');
    const devices = snapshot.val(); // 여기서 웹 관리자 모드의 기기들 싹 가져옴
    if (!devices) process.exit(0);

    for (const deviceId in devices) {
      try {
        const res = await context.request({ path: `/v1.0/devices/${deviceId}/status`, method: 'GET' });
        if (res.success) {
          let temp = 0, humi = 0;
          res.result.forEach(item => {
            if (['va_temperature', 'temp_current'].includes(item.code)) temp = item.value > 100 ? item.value / 10 : item.value;
            if (['va_humidity', 'humidity_value'].includes(item.code)) humi = item.value;
          });
          await db.ref(`devices/${deviceId}`).update({ temperature: temp, humidity: humi, lastUpdated: kstTime });
        }
      } catch (e) { console.log(`${deviceId} 오류: ${e.message}`); }
    }
  } catch (e) { console.error(e); }
  process.exit(0);
}
collect();
