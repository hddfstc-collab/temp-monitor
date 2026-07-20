console.log("▶️ [1 단계] test.js 파일 로드 시작");

const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

console.log("▶️ [2 단계] 라이브러리 로드 완료");

const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCr6Z3Suri1Fo7D\nYiRYwCCpqGnZa6TqUWOFEjeU/X3Z8EHWNkRJ1Ss7AkMlp9kH6KXKVOX9vqoJF4Vm\n96YhnGlv5kB+JSXskjeJAFWhDL3maISmvm8auvKh+YSDnScFHLpvSRVgMSUYu3UX\ns4zVRLci3mZ4s0Hb0zDJJx9wBWfyMc+XfrmoMnSF4aZ+U9or4kTulr45N+fV2MtI\nCIBLrD5nsTU1SHtIrvg9PfJiuaRm9UvMY8DXvyZYHOBoqWPHvNvZFRoUkjLOU8jS\nASiyOTvFRqm8u8dY+SgtySdZK25cEouUK7tQFH24yUVZ/fBSfsHtWRNOpY0iaE3v\nRgv7jgnpAgMBAAECggEAEY3VU8NFQRiAk2reE0HrE+fihxT6zgJpixkFG+2WgD6M\nOndoGbHurCPa/2lYO/qBk1t/8J0bd7ozIQSArkXubkKwqzDX4oQ7r32dQMiwS2q4\nwN4JMk2MoQV9hoLxjRAV6W8pA52BEDl0B2uKIezWVnUnOYP0YaH7BU89Yo7qwkww\n0Q1rVAhvt+vTFtnmgnEsKc/wR4zJiZqJtZyNNWHrRHuCu4pNSc/lCUenakWVDpDD\n5cK9tq4vdQlt6hLIbn/Le2I7un+qiiVJufTBBw+jOevjTxDVmVGqfJg11hOOeAp/\neXCVyhTSAWWJcnvHjwGVQK9mXzjrHA8q452biOyekQKBgQDi16Un1zwpHO1Lrquj\n7rXP9ZmzGy3o5WeEz5T/AM7VBds6/xwEa3bAYq3u2y+ahnT38G5snrX7oG3CDcxp\nj0sCLNLS6gOQA4VrbQfbZSfRyWzamNlgC3R+GK6xikEzvdDeDGwM6p0G5Fmy54UD\NL0KRZO4KQebmP4K2ftQEkkWqwKBgQDCAnr9VS3ZjO5sw9Y36Lg3WFCqH4dGxDed\nEsKpKAKR/kR8nqVRN5u5al+iItCbFfzxhlHs4YNYzkwAsDiKKXC0D87vnJRCA+N8\nfHGdB+DR0uAwWNLFLH6NE1El2FlMsJTwP6y8hms4KRKUvd0TQ6lgp3CerkonNXlM\nT5Kva3txuwKBgFoHL9riB1Rh0KPKzQAgyzOfy8JTtSLLeQwyvnV+Qpg03M9LVDlE\n1TqBb3purzPqzR1h5NFjI+KbxzPO+iOi5SgV1g4zJfrQCvGZshaWzPjrsjIHm64M\nnc01yo9XyYzZdr3JvFBcBLopgpgIXrfpBGXBO2FJl2VfkOOJo74ho7RFAoGAPv+R\nMmwTbF5QGa9qA1OlZgtefi+ovLkAmhe6cDVWyFN5p8HYSsw02/uHvF1zwbhdH4yP\nU81S2mZ61YpjgbG9MCsl9jaxCdK7bvP17JjfTyMbu3dMUcyF94d7RT/Al5+LbYwv\nqjQ34s+rgfM5M4U4HfOhJVXRLHQ3xDjep+nN9vsCgYAHx65VJSJDz+58N1395GOy\nX18KYFRbFIQWRnF4955ozbXcQgMpxrLUZw7b2Qgi9wujpFQxsvyeYCKETkMXR6tY\nWUawlWN9u1NpLzmntz+0hEBxVfGtD+6iKqDDYQYpiH44Jk/L+tJuTFP0yfLe2QSo\nkLrXZ62F0Wiw7QPKvVmSNw==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com",
  "client_id": "104606797071904398095",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com"
};

// 💡 [치료 장치] 글자로 깨진 줄바꿈 기호를 정상적인 키 포맷으로 강제 복원합니다.
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = getDatabase();
console.log("▶️ [3 단계] 파이어베이스 연결 객체 생성 완료");

const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9',
});

function requestWithTimeout(promise, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('무응답 타임아웃 발생')), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function collect() {
  console.log("▶️ [4 단계] collect() 함수 내부 진입 성공");
  const now = new Date();
  const timestamp = Date.now();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  try {
    console.log("▶️ [5 단계] 파이어베이스 기기 목록 요청 조회 시작...");
    
    // 💡 최초 구글 인증 및 접속 시간을 감안하여 대기 시간을 25초로 조정
    const devicesSnapshot = await requestWithTimeout(db.ref('devices').once('value'), 25000);
    const devicesData = devicesSnapshot.val();

    if (!devicesData) {
      console.log("⚠️ [실패] 파이어베이스에 등록된 기기 데이터가 아예 비어있습니다.");
      process.exit(0);
    }

    const keys = Object.keys(devicesData);
    console.log(`📡 [확인] 총 ${keys.length}개의 기기를 찾았습니다. 수집을 시작합니다.`);

    for (const key of keys) {
      try {
        const currentDevice = devicesData[key];
        const deviceId = currentDevice.id || currentDevice.deviceId || key;
        const deviceName = currentDevice.name || "미지정 온도계";
        const deviceZone = currentDevice.zone || "1구역";

        if (!deviceId || deviceId.length < 10) {
          console.log(`⏩ [스킵] 올바르지 않은 기기 ID: ${key}`);
          continue;
        }

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
          
          console.log(`✅ [${deviceName}] 수집 및 파이어베이스 저장 완료 (현재온도: ${temp}°C)`);
        } else {
          console.log(`⚠️ [${deviceName}] 투야 서버 에러 반환:`, res ? res.msg : '응답없음');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (deviceError) {
        console.error(`🔥 [${key}] 수집 건너뜀 사유:`, deviceError.message);
      }
    }

    await db.ref('debug').update({ last_success: kstTime, status: "OK" });
    console.log("🏁 모든 수집 프로세스가 완벽히 종료되었습니다!");
    process.exit(0);
  } catch (e) {
    console.error("🔥 [치명적 에러] 데이터 조회 단계 실패:", e.message);
    process.exit(1);
  }
}

console.log("▶️ [6 단계] 맨 밑바닥 collect() 함수 호출 직전");
collect();
