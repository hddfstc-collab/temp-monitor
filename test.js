const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 💡 모바일 복사 시 줄바꿈 유실을 막기 위해 각 행을 배열로 분리했습니다.
const privateKeyLines = [
  "-----BEGIN PRIVATE KEY-----",
  "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCr6Z3Suri1Fo7D",
  "YiRYwCCpqGnZa6TqUWOFEjeU/X3Z8EHWNkRJ1Ss7AkMlp9kH6KXKVOX9vqoJF4Vm",
  "96YhnGlv5kB+JSXskjeJAFWhDL3maISmvm8auvKh+YSDnScFHLpvSRVgMSUYu3UX",
  "s4zVRLci3mZ4s0Hb0zDJJx9wBWfyMc+XfrmoMnSF4aZ+U9or4kTulr45N+fV2MtI",
  "CIBLrD5nsTU1SHtIrvg9PfJiuaRm9UvMY8DXvyZYHOBoqWPHvNvZFRoUkjLOU8jS",
  "ASiyOTvFRqm8u8dY+SgtySdZK25cEouUK7tQFH24yUVZ/fBSfsHtWRNOpY0iaE3v",
  "Rgv7jgnpAgMBAAECggEAEY3VU8NFQRiAk2reE0HrE+fihxT6zgJpixkFG+2WgD6M",
  "OndoGbHurCPa/2lYO/qBk1t/8J0bd7ozIQSArkXubkKwqzDX4oQ7r32dQMiwS2q4",
  "wN4JMk2MoQV9hoLxjRAV6W8pA52BEDl0B2uKIezWVnUnOYP0YaH7BU89Yo7qwkww",
  "0Q1rVAhvt+vTFtnmgnEsKc/wR4zJiZqJtZyNNWHrRHuCu4pNSc/lCUenakWVDpDD",
  "5cK9tq4vdQlt6hLIbn/Le2I7un+qiiVJufTBBw+jOevjTxDVmVGqfJg11hOOeAp/",
  "eXCVyhTSAWWJcnvHjwGVQK9mXzjrHA8q452biOyekQKBgQDi16Un1zwpHO1Lrquj",
  "7rXP9ZmzGy3o5WeEz5T/AM7VBds6/xwEa3bAYq3u2y+ahnT38G5snrX7oG3CDcxp",
  "j0sCLNLS6gOQA4VrbQfbZSfRyWzamNlgC3R+GK6xikEzvdDeDGwM6p0G5Fmy54UD",
  "NL0KRZO4KQebmP4K2ftQEkkWqwKBgQDCAnr9VS3ZjO5sw9Y36Lg3WFCqH4dGxDed",
  "EsKpKAKR/kR8nqVRN5u5al+iItCbFfzxhlHs4YNYzkwAsDiKKXC0D87vnJRCA+N8",
  "fHGdB+DR0uAwWNLFLH6NE1El2FlMsJTwP6y8hms4KRKUvd0TQ6lgp3CerkonNXlM",
  "T5Kva3txuwKBgFoHL9riB1Rh0KPKzQAgyzOfy8JTtSLLeQwyvnV+Qpg03M9LVDlE",
  "1TqBb3purzPqzR1h5NFjI+KbxzPO+iOi5SgV1g4zJfrQCvGZshaWzPjrsjIHm64M",
  "nnc01yo9XyYzZdr3JvFBcBLopgpgIXrfpBGXBO2FJl2VfkOOJo74ho7RFAoGAPv+",
  "MmwTbF5QGa9qA1OlZgtefi+ovLkAmhe6cDVWyFN5p8HYSsw02/uHvF1zwbhdH4yP",
  "U81S2mZ61YpjgbG9MCsl9jaxCdK7bvP17JjfTyMbu3dMUcyF94d7RT/Al5+LbYwv",
  "qjQ34s+rgfM5M4U4HfOhJVXRLHQ3xCjep+nN9vsCgYAHx65VJSJDz+58N1395GOy",
  "X18KYFRbFIQWRnF4955ozbXcQgMpxrLUZw7b2Qgi9wujpFQxsvyeYCKETkMXR6tY",
  "WUawlWN9u1NpLzmntz+0hEBxVfGtD+6iKqDDYQYpiH44Jk/L+tJuTFP0yfLe2QSo",
  "nkLrXZ62F0Wiw7QPKvVmSNw==",
  "-----END PRIVATE KEY-----"
];

const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": privateKeyLines.join('\n'), // 💡 여기서 정확하게 표준 규격으로 조립됩니다.
  "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com",
  "client_id": "104606797071904398095",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com"
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
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

// 투야 API 4초 제한 타임아웃 핀
function requestWithTimeout(promise, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tuya API 4초 응답 타임아웃')), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function collect() {
  console.log("📡 [연결] 파이어베이스 접속 성공! 데이터를 조회합니다.");
  const now = new Date();
  const timestamp = Date.now();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  try {
    const devicesSnapshot = await db.ref('devices').once('value');
    const devicesData = devicesSnapshot.val();

    if (!devicesData) {
      console.log("⚠️ 파이어베이스 기기 목록이 비어있습니다.");
      process.exit(0);
    }

    const keys = Object.keys(devicesData);
    console.log(`📊 총 ${keys.length}개의 온도계를 순서대로 하나씩 수집합니다.`);

    for (const key of keys) {
      try {
        const currentDevice = devicesData[key];
        const deviceId = currentDevice.id || currentDevice.deviceId || key;
        const deviceName = currentDevice.name || "미지정 온도계";
        const deviceZone = currentDevice.zone || "1구역";

        if (!deviceId || deviceId.length < 10) continue;

        console.log(`[조회] ${deviceName} (${deviceId})`);

        // 4초 제한 적용하여 투야 서버 찌르기
        const res = await requestWithTimeout(
          context.request({ path: `/v1.0/devices/${deviceId}/status`, method: 'GET' }),
          4000
        );

        if (res && res.success) {
          let temp = 0, humi = 0, battery = 0;
          res.result.forEach(item => {
            if (item.code === 'va_temperature' || item.code === 'temp_current') temp = item.value > 100 ? item.value / 10 : item.value;
            if (item.code === 'va_humidity' || item.code === 'humidity_value') humi = item.value;
            if (item.code === 'battery_percentage' || item.code === 'battery') battery = item.value;
          });

          await db.ref(`history/${deviceId}/${timestamp}`).set({ battery, humidity: humi, name: deviceName, temperature: temp, time: kstTime, zone: deviceZone });
          await db.ref(`devices/${key}`).update({ temperature: temp, humidity: humi, battery, lastUpdated: kstTime });
          
          console.log(`✅ ${deviceName} 업데이트 완료 (온도: ${temp}°C)`);
        } else {
          console.log(`⚠️ ${deviceName} 응답 에러:`, res ? res.msg : '무응답');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (deviceError) {
        console.error(`🔥 기기 건너뜀 사유:`, deviceError.message);
      }
    }

    await db.ref('debug').update({ last_success: kstTime, status: "OK" });
    console.log("🏁 모든 매장의 온도 수집 프로세스가 완전히 끝났습니다.");
    process.exit(0);
  } catch (e) {
    console.error("🔥 [치명적 오류] 프로세스가 중단되었습니다:", e.message);
    process.exit(1);
  }
}

collect();
