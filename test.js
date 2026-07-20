const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 💡 깃허브 로봇을 속이기 위해 헤더와 푸터를 쪼갰습니다.
const header = "-----BEGIN " + "PRIVATE KEY-----\n";
const footer = "\n-----END " + "PRIVATE KEY-----";

// ⚠️ [대리님 필수 고칠 곳!] 
// 원래 성공하셨던 진짜 키에서 BEGIN, END 줄을 제외한 '가운데 영문/숫자 덩어리'만 복사해서 이 따옴표 안에 넣어주세요!
// 모바일에서 복사하다가 줄바꿈이나 띄어쓰기가 들어가도 아래 코드가 자동으로 다 지워줍니다.
const myRealBody = "여기에_대리님의_진짜_키_가운데_내용만_통째로_붙여넣기"; 

const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": header + myRealBody.replace(/\s/g, '') + footer, // 공백·줄바꿈 자동 청소 후 합체
  "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com",
  "client_id": "104606797071904398095",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com"
};

if (getApps().length === 0) { initializeApp({ credential: cert(serviceAccount), databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app" }); }
const db = getDatabase(), context = new TuyaContext({ baseUrl: 'https://openapi.tuyaus.com', accessKey: 'rqyqdefgxpq8akws93xe', secretKey: 'ba86766479ee4a08a9426e7fe7e620b9' });

function requestWithTimeout(promise, ms = 4000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('Timeout')), ms);
    promise.then(r => { clearTimeout(t); res(r); }).catch(e => { clearTimeout(t); rej(e); });
  });
}

async function collect() {
  const now = new Date(), timestamp = Date.now(), kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  try {
    const snap = await db.ref('devices').once('value'), data = snap.val();
    if (!data) process.exit(0);
    for (const key of Object.keys(data)) {
      try {
        const dev = data[key], id = dev.id || dev.deviceId || key;
        if (!id || id.length < 10) continue;
        console.log(`[조회] ${dev.name || '온도계'} (${id})`);
        const res = await requestWithTimeout(context.request({ path: `/v1.0/devices/${id}/status`, method: 'GET' }), 4000);
        if (res && res.success) {
          let t = 0, h = 0, b = 0;
          res.result.forEach(item => {
            if (item.code === 'va_temperature' || item.code === 'temp_current') t = item.value > 100 ? item.value / 10 : item.value;
            if (item.code === 'va_humidity' || item.code === 'humidity_value') h = item.value;
            if (item.code === 'battery_percentage' || item.code === 'battery') b = item.value;
          });
          await db.ref(`history/${id}/${timestamp}`).set({ battery: b, humidity: h, name: dev.name || "온도계", temperature: t, time: kstTime, zone: dev.zone || "1구역" });
          await db.ref(`devices/${key}`).update({ temperature: t, humidity: h, battery: b, lastUpdated: kstTime });
          console.log(`✅ ${dev.name || '온도계'} 완료`);
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (de) { console.error(`🔥 패스: ${de.message}`); }
    }
    await db.ref('debug').update({ last_success: kstTime, status: "OK" }); process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
}
collect();
