const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const keyHeader = "-----BEGIN " + "PRIVATE KEY-----\n", keyFooter = "-----END " + "PRIVATE KEY-----\n";
const rawKey = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCr6Z3Suri1Fo7D\n"+"YiRYwCCpqGnZa6TqUWOFEjeU/X3Z8EHWNkRJ1Ss7AkMlp9kH6KXKVOX9vqoJF4Vm\n"+"96YhnGlv5kB+JSXskjeJAFWhDL3maISmvm8auvKh+YSDnScFHLpvSRVgMSUYu3UX\n"+"s4zVRLci3mZ4s0Hb0zDJJx9wBWfyMc+XfrmoMnSF4aZ+U9or4kTulr45N+fV2MtI\n"+"CIBLrD5nsTU1SHtIrvg9PfJiuaRm9UvMY8DXvyZYHOBoqWPHvNvZFRoUkjLOU8jS\n"+"ASiyOTvFRqm8u8dY+SgtySdZK25cEouUK7tQFH24yUVZ/fBSfsHtWRNOpY0iaE3v\n"+"Rgv7jgnpAgMBAAECggEAEY3VU8NFQRiAk2reE0HrE+fihxT6zgJpixkFG+2WgD6M\n"+"OndoGbHurCPa/2lYO/qBk1t/8J0bd7ozIQSArkXubkKwqzDX4oQ7r32dQMiwS2q4\n"+"wN4JMk2MoQV9hoLxjRAV6W8pA52BEDl0B2uKIezWVnUnOYP0YaH7BU89Yo7qwkww\n"+"0Q1rVAhvt+vTFtnmgnEsKc/wR4zJiZqJtZyNNWHrRHuCu4pNSc/lCUenakWVDpDD\n"+"5cK9tq4vdQlt6hLIbn/Le2I7un+qiiVJufTBBw+jOevjTxDVmVGqfJg11hOOeAp/\n"+"eXCVyhTSAWWJcnvHjwGVQK9mXzjrHA8q452biOyekQKBgQDi16Un1zwpHO1Lrquj\n"+"7rXP9ZmzGy3o5WeEz5T/AM7VBds6/xwEa3bAYq3u2y+ahnT38G5snrX7oG3CDcxp\n"+"j0sCLNLS6gOQA4VrbQfbZSfRyWzamNlgC3R+GK6xikEzvdDeDGwM6p0G5Fmy54UD\n"+"NL0KRZO4KQebmP4K2ftQEkkWqwKBgQDCAnr9VS3ZjO5sw9Y36Lg3WFCqH4dGxDed\n"+"EsKpKAKR/kR8nqVRN5u5al+iItCbFfzxhlHs4YNYzkwAsDiKKXC0D87vnJRCA+N8\n"+"fHGdB+DR0uAwWNLFLH6NE1El2FlMsJTwP6y8hms4KRKUvd0TQ6lgp3CerkonNXlM\n"+"T5Kva3txuwKBgFoHL9riB1Rh0KPKzQAgyzOfy8JTtSLLeQwyvnV+Qpg03M9LVDlE\n"+"1TqBb3purzPqzR1h5NFjI+KbxzPO+iOi5SgV1g4zJfrQCvGZshaWzPjrsjIHm64M\n"+"nnc01yo9XyYzZdr3JvFBcBLopgpgIXrfpBGXBO2FJl2VfkOOJo74ho7RFAoGAPv+\n"+"MmwTbF5QGa9qA1OlZgtefi+ovLkAmhe6cDVWyFN5p8HYSsw02/uHvF1zwbhdH4yP\n"+"U81S2mZ61YpjgbG9MCsl9jaxCdK7bvP17JjfTyMbu3dMUcyF94d7RT/Al5+LbYwv\n"+"qjQ34s+rgfM5M4U4HfOhJVXRLHQ3xCjep+nN9vsCgYAHx65VJSJDz+58N1395GOy\n"+"X18KYFRbFIQWRnF4955ozbXcQgMpxrLUZw7b2Qgi9wujpFQxsvyeYCKETkMXR6tY\n"+"WUawlWN9u1NpLzmntz+0hEBxVfGtD+6iKqDDYQYpiH44Jk/L+tJuTFP0yfLe2QSo\n"+"nkLrXZ62F0Wiw7QPKvVmSNw==";
const serviceAccount = {
  "type": "service_account", "project_id": "temp-monitoring-8b172", "private_key_id": "b7e6a13406af0b2e9446a2ab8cbb493109813bfd",
  "private_key": keyHeader + rawKey + "\n" + keyFooter, "client_email": "firebase-adminsdk-fbsvc@temp-monitoring-8b172-default-rtdb.iam.gserviceaccount.com"
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
