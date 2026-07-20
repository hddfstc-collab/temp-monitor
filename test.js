const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
// 최신 규격에 맞게 분리하여 안전하게 불러오기 (버전 크래시 방지)
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// 1. 파이어베이스 설정 (기존 마스터 키 그대로 유지)
const serviceAccount = {
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCr6Z3Suri1Fo7D\nYiRYwCCpqGnZa6TqUWOFEjeU/X3Z8EHWNkRJ1Ss7AkMlp9kH6KXKVOX9vqoJF4Vm\n96YhnGlv5kB+JSXskjeJAFWhDL3maISmvm8auvKh+YSDnScFHLpvSRVgMSUYu3UX\ns4zVRLci3mZ4s0Hb0zDJJx9wBWfyMc+XfrmoMnSF4aZ+U9or4kTulr45N+fV2MtI\nCIBLrD5nsTU1SHtIrvg9PfJiuaRm9UvMY8DXvyZYHOBoqWPHvNvZFRoUkjLOU8jS\nASiyOTvFRqm8u8dY+SgtySdZK25cEouUK7tQFH24yUVZ/fBSfsHtWRNOpY0iaE3v\nRgv7jgnpAgMBAAECggEAEY3VU8NFQRiAk2reE0HrE+fihxT6zgJpixkFG+2WgD6M\nOndoGbHurCPa/2lYO/qBk1t/8J0bd7ozIQSArkXubkKwqzDX4oQ7r32dQMiwS2q4\nwN4JMk2MoQV9hoLxjRAV6W8pA52BEDl0B2uKIezWVnUnOYP0YaH7BU89Yo7qwkww\n0Q1rVAhvt+vTFtnmgnEsKc/wR4zJiZqJtZyNNWHrRHuCu4pNSc/lCUenakWVDpDD\n5cK9tq4vdQlt6hLIbn/Le2I7un+qiiVJufTBBw+jOevjTxDVmVGqfJg11hOOeAp/\neXCVyhTSAWWJcnvHjwGVQK9mXzjrHA8q452biOyekQKBgQDi16Un1zwpHO1Lrquj\n7rXP9ZmzGy3o5WeEz5T/AM7VBds6/xwEa3bAYq3u2y+ahnT38G5snrX7oG3CDcxp\nj0sCLNLS6gOQA4VrbQfbZSfRyWzamNlgC3R+GK6xikEzvdDeDGwM6p0G5Fmy54UD\NL0KRZO4KQebmP4K2ftQEkkWqwKBgQDCAnr9VS3ZjO5sw9Y36Lg3WFCqH4dGxDed\nEsKpKAKR/kR8nqVRN5u5al+iItCbFfzxhlHs4YNYzkwAsDiKKXC0D87vnJRCA+N8\nfHGdB+DR0uAwWNLFLH6NE1El2FlMsJTwP6y8hms4KRKUvd0TQ6lgp3CerkonNXlM\nT5Kva3txuwKBgFoHL9riB1Rh0KPKzQAgyzOfy8JTtSLLeQwyvnV+Qpg03M9LVDlE\n1TqBb3purzPqzR1h5NFjI+KbxzPO+iOi5SgV1g4zJfrQCvGZshaWzPjrsjIHm64M\nnc01yo9XyYzZdr3JvFBcBLopgpgIXrfpBGXBO2FJl2VfkOOJo74ho7RFAoGAPv+R\nMmwTbF5QGa9qA1OlZgtefi+ovLkAmhe6cDVWyFN5p8HYSsw02/uHvF1zwbhdH4yP\nU81S2mZ61YpjgbG9MCsl9jaxCdK7bvP17JjfTyMbu3dMUcyF94d7RT/Al5+LbYwv\nqjQ34s+rgfM5M4U4HfOhJVXRLHQ3xCjep+nN9vsCgYAHx65VJSJDz+58N1395GOy\nX18KYFRbFIQWRnF4955ozbXcQgMpxrLUZw7b2Qgi9wujpFQxsvyeYCKETkMXR6tY\nWUawlWN9u1NpLzmntz+0hEBxVfGtD+6iKqDDYQYpiH44Jk/L+tJuTFP0yfLe2QSo\nkLrXZ62F0Wiw7QPKvVmSNw==\n-----END PRIVATE KEY-----\n",
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

async function collect() {
  const now = new Date();
  const timestamp = Date.now();
  const kstTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  try {
    // 💡 변경 포인트 1: 파이어베이스에 등록된 기기 리스트를 통째로 읽어옵니다.
    const devicesSnapshot = await db.ref('devices').once('value');
    const devicesData = devicesSnapshot.val();

    if (!devicesData) {
      console.log("⚠️ 파이어베이스에 등록된 기기 정보가 없습니다.");
      process.exit(0);
    }

    const deviceIds = Object.keys(devicesData);
    console.log(`📡 총 ${deviceIds.length}개의 기기 수집을 시작합니다.`);

    // 💡 변경 포인트 2: 반복문을 돌며 기기별로 투야 서버에 온도를 물어봅니다.
    for (const deviceId of deviceIds) {
      try {
        const currentDevice = devicesData[deviceId];
        const deviceName = currentDevice.name || "미지정 온도계";
        const deviceZone = currentDevice.zone || "미지정 구역";

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

          // history 누적 저장
          await db.ref(`history/${deviceId}/${timestamp}`).set({
            battery: battery || 36, 
            humidity: humi,
            name: deviceName,
            temperature: temp,
            time: kstTime,
            zone: deviceZone
          });

          // 실시간 기기 정보 업데이트
          await db.ref(`devices/${deviceId}`).update({
            temperature: temp,
            humidity: humi,
            battery: battery || 36,
            lastUpdated: kstTime
          });

          console.log(`✅ [${deviceName}] 수집 완료: ${temp}°C / ${humi}%`);
        } else {
          // 개별 기기 실패 시 로그 출력 및 파이어베이스 기록
          console.error(`❌ [${deviceId}] 투야 API 조회 실패:`, res.msg);
          await db.ref('debug').update({ last_fail: kstTime, status: "TUYA_FAIL", reason: `ID: ${deviceId} - ${res.msg}` });
        }
      } catch (deviceError) {
        console.error(`🔥 [${deviceId}] 통신 에러 발생:`, deviceError.message);
      }
    }

    // 모든 기기 순회가 끝나면 최종 성공 처리 후 종료
    await db.ref('debug').update({ last_success: kstTime, status: "OK" });
    process.exit(0);

  } catch (e) {
    // 💡 변경 포인트 3: 에러 발생 시 깃허브 콘솔창에 상세 이유가 찍히도록 보완
    console.error("🔥 전체 프로세스 크래시 원인:", e);
    await db.ref('debug').update({ last_fail: kstTime, status: "CRASH", error: e.message });
    process.exit(1);
  }
}

collect();
