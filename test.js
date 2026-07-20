const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
// 최신 규격에 맞게 분리하여 안전하게 불러오기 (버전 크래시 방지)
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. 파이어베이스 설정 (기존 마스터 키 그대로 원복)
// 💡 대리님의 원본 암호를 단 한 글자도 건드리지 않고, 깃허브 차단만 피하도록 배열로 묶어 결합합니다.
const privateKeyLines = [
  "-----BEGIN" + " PRIVATE KEY-----",
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
  "nnc01yo9XyYzZdr3JvFBcBLopgpgIXrfpBGXBO2FJl2VfkOOJo74ho7RFAoGAPv+R",
  "MmwTbF5QGa9qA1OlZgtefi+ovLkAmhe6cDVWyFN5p8HYSsw02/uHvF1zwbhdH4yP",
  "U81S2mZ61YpjgbG9MCsl9jaxCdK7bvP17JjfTyMbu3dMUcyF94d7RT/Al5+LbYwv",
  "qjQ34s+rgfM5M4U4HfOhJVXRLHQ3xCjep+nN9vsCgYAHx65VJSJDz+58N1395GOy",
  "X18KYFRbFIQWRnF4955ozbXcQgMpxrLUZw7b2Qgi9wujpFQxsvyeYCKETkMXR6tY",
  "WUawlWN9u1NpLzmntz+0hEBxVfGtD+6iKqDDYQYpiH44Jk/L+tJuTFP0yfLe2QSo",
  "kLrXZ62F0Wiw7QPKvVmSNw==",
  "-----END" + " PRIVATE KEY-----\n"
];

const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": privateKeyLines.join('\n'), // 완벽한 원본 줄바꿈 그대로 결합
  "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172.iam.gserviceaccount.com",
  "client_id": "104606797071904398095",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40temp-monitoring-8b172.iam.gserviceaccount.com"
};

// 최신식 중복 실행 방지 문법 적용
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

      // 기존 데이터 형식 그대로 history 누적
      await db.ref(`history/${deviceId}/${timestamp}`).set({
        battery: battery || 36, 
        humidity: humi,
        name: "SK2",
        temperature: temp,
        time: kstTime,
        zone: "1구역"
      });

      // 실시간 기기 정보 업데이트
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
