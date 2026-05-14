const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 1. 파이어베이스 설정 (아까 넣으신 JSON 내용을 여기에 그대로 유지하세요!)
const serviceAccount = JSON.parse(`
{
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  ... (파이어베이스 키 내용 생략, 기존 내용 유지)
}
`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = admin.database();

// 2. 투야 설정 (사진에서 확인된 값입니다)
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

async function collect() {
  const now = new Date();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const deviceId = "eb0b4a165182f9fd92d7yb"; // 사진에 찍힌 온습도계 ID

  try {
    // ⚠️ 핵심: 공식 라이브러리의 request 기능을 사용하여 서명을 자동 생성합니다.
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
      // 투야가 뱉는 구체적인 에러 메시지를 파이어베이스에 남깁니다.
      await db.ref('debug').update({ error: res.msg, code: res.code, at: kstTime, status: "Tuya Error" });
      console.log(`❌ 투야 에러: ${res.msg}`);
    }
  } catch (e) {
    await db.ref('debug').update({ error: e.message, at: kstTime, status: "System Error" });
  }
}

collect();
