const admin = require("firebase-admin");

// 서비스 계정 키를 환경 변수로 처리하거나 경로 설정
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

async function testConnection() {
  try {
    const snapshot = await db.ref('devices').once('value');
    const data = snapshot.val();
    console.log("데이터 읽기 성공:", data);
  } catch (error) {
    console.error("데이터 읽기 실패:", error);
    process.exit(1);
  }
}

testConnection();
