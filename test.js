// 1. 서버 응답 체크용 (Render 등 호스팅 서비스용)
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Engine is running');
}).listen(process.env.PORT || 10000);

const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const admin = require('firebase-admin');

// 2. 파이어베이스 관리자 설정
// 다운로드받은 서비스 계정 JSON 파일 내용을 아래 ` ` 사이에 그대로 붙여넣으세요.
const serviceAccount = JSON.parse(`
{
  "type": "service_account",
  "project_id": "temp-monitoring-8b172",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = admin.database();

// 3. 투야 설정 (공식 라이브러리가 서명을 자동 처리합니다)
const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: 'rqyqdefgxpq8akws93xe',
  secretKey: 'ba86766479ee4a08a9426e7fe7e620b9', 
});

// 4. 데이터 수집 및 저장 함수
async function collectAndSaveData() {
  const now = new Date();
  const currentTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`[${currentTime}] 데이터 수집 시도 중...`);

  try {
    // 파이어베이스에서 기기 목록 가져오기
    const snapshot = await db.ref('devices').once('value');
    const devices = snapshot.val();
    
    if (!devices) {
      console.log("등록된 기기가 없습니다.");
      // 연결 확인용 디버그 로그
      await db.ref('debug').update({ at: currentTime, status: "No devices found" });
      return;
    }

    for (const deviceId in devices) {
      const device = devices[deviceId];
      
      // 투야 API 호출 (공식 SDK가 알아서 토큰 발급 및 서명 생성)
      const res = await context.request({
        path: `/v1.0/devices/${deviceId}/status`,
        method: 'GET',
      });

      if (res.success) {
        let currentTemp = 0;
        let currentHumi = 0;

        // 결과값 추출
        res.result.forEach(item => {
          if (item.code === 'va_temperature' || item.code === 'temp_current') {
            currentTemp = item.value > 100 ? item.value / 10 : item.value;
          }
          if (item.code === 'va_humidity' || item.code === 'humidity_value') {
            currentHumi = item.value;
          }
        });

        // 파이어베이스 업데이트
        const timestamp = Date.now();
        await db.ref(`devices/${deviceId}`).update({
          temperature: currentTemp,
          humidity: currentHumi,
          lastUpdated: currentTime
        });

        // 히스토리 기록
        await db.ref(`history/${deviceId}/${timestamp}`).set({
          temperature: currentTemp,
          humidity: currentHumi,
          time: currentTime
        });

        // 최종 성공 로그
        await db.ref('debug').update({ 
          last_success: currentTime, 
          status: "OK", 
          temp: currentTemp,
          error: null 
        });
        
        console.log(`✨ [${deviceId}] 기록 완료: ${currentTemp}°C`);
      } else {
        console.error(`❌ 투야 에러: ${res.msg}`);
        await db.ref('debug').update({ error: res.msg, at: currentTime });
      }
    }
  } catch (e) {
    console.error("수집 중 시스템 에러:", e.message);
    await db.ref('debug').update({ error: e.message, at: currentTime });
  }
}

// 실행
collectAndSaveData();

// (선택사항) 10분마다 반복 실행 (서버용)
// setInterval(collectAndSaveData, 600000);
