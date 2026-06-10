const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. 파이어베이스 설정 (비밀키는 GitHub Secrets에서 안전하게 로드)
const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": process.env.FIREBASE_PRIVATE_KEY, // 🔒 키 숨기기 완료
  "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172.iam.gserviceaccount.com",
  "client_id": "104606797071904398095",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40temp-monitoring-8b172.iam.gserviceaccount.com"
};

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
  secretKey: process.env.TUYA_SECRET_KEY, // 🔒 키 숨기기 완료
});

async function collect() {
  const now = new Date();
  const timestamp = Date.now();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const deviceId = "eb0b4a165182f9fd92d7yb"; 

  try {
    const res = await context.request({
      path: `/v1.0/devices/${deviceId}/status`,
      method: 'GET',
    });

    if (res.success) {
      let temp = 0, humi = 0, battery = 0;

      res.result.forEach(item => {
        if (item.code === 'va_temperature' || item.code === 'temp_current') {
          temp = item.value > 100 ? item.value / 10 : item.value;
        }
        if (item.code === 'va_humidity' || item.code === 'humidity_value') {
          humi = item.value;
        }
        if (item.code === 'battery_percentage' || item.code === 'battery') {
          battery = item.value;
        }
      });

      await db.ref(`history/${deviceId}/${timestamp}`).set({
        battery: battery || 36, 
        humidity: humi,
        name: "SK2",
        temperature: temp,
        time: kstTime,
        zone: "1구역"
      });

      await db.ref(`devices/${deviceId}`).update({
        temperature: temp,
        humidity: humi,
        battery: battery || 36,
        lastUpdated: kstTime
      });
      
      await db.ref('debug').update({ last_success: kstTime, status: "OK", temp: temp });
      process.exit(0);
    } else {
      await db.ref('debug').update({ last_fail: kstTime, status: "TUYA_FAIL", reason: res.msg });
      process.exit(1);
    }
  } catch (e) {
    await db.ref('debug').update({ last_fail: kstTime, status: "CRASH", error: e.message });
    process.exit(1);
  }
}

collect();
