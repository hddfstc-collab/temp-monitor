const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 1. 파이어베이스 설정
// 다운로드받은 JSON 파일의 내용을 { } 포함해서 아래 ` ` 사이에 붙여넣으세요.
const serviceAccount = JSON.parse(`
{
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "여기에_입력",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "여기에_입력",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "여기에_입력"
}
`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = admin.database();

// 2. 투야 설정 (사진 image_afacd8.png 확인 값)
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

async function collect() {
  const now = new Date();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const deviceId = "eb0b4a165182f9fd92d7yb"; // 사진 image_afacb4.png 확인 값

  console.log(`[${kstTime}] 데이터 수집 시도 중...`);

  try {
    const res = await context.request({
      path: `/v1.0/devices/${deviceId}/status`,
      method: 'GET',
    });

    if (res.success) {
      let temp = 0, humi = 0;
      res.result.forEach(item => {
        if (item.code === 'va_temperature' || item.code === 'temp_current') {
            temp = item.value > 100 ? item.value / 10 : item.value;
        }
        if (item.code === 'va_humidity' || item.code === 'humidity_value') {
            humi = item.value;
        }
      });

      // 파이어베이스 업데이트
      await db.ref(`devices/${deviceId}`).update({
        temperature: temp,
        humidity: humi,
        lastUpdated: kstTime
      });
      
      await db.ref('debug').update({ last_success: kstTime, temp: temp, status: "OK", error: null });
      console.log(`✅ 성공: ${temp}도`);
    } else {
      await db.ref('debug').update({ error: res.msg, code: res.code, at: kstTime, status: "Tuya Error" });
      console.log(`❌ 투야 에러: ${res.msg}`);
    }
  } catch (e) {
    console.error("시스템 에러:", e.message);
    await db.ref('debug').update({ error: e.message, at: kstTime, status: "System Error" });
  }
}

collect();
