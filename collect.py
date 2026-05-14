import requests
import time
import datetime
import hmac
import hashlib

# --- [기존 정보 동일] ---
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com" 

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    # 토큰 발급용 서명: AccessID + Timestamp
    sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
    headers = {
        't': t,
        'sign': sign,
        'client_id': ACCESS_ID,
        'sign_method': 'HMAC-SHA256'
    }
    try:
        response = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=headers)
        res = response.json()
        if res.get('success'):
            return res.get('result', {}).get('access_token')
        return None
    except:
        return None

def collect():
    token = get_tuya_token()
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y. %m. %d. %p %I:%M:%S')

    if not token:
        # 이 부분이 실행된다면 여전히 토큰 발급에 문제가 있는 것입니다.
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "tuya_token_failed_final", "at": now_kst})
        return

    dev_id = "eb0b4a165182f9fd92d7yb" 
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{dev_id}/status"
    
    # 데이터 조회용 서명 생성 (최신 방식 적용)
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign = get_sign(ACCESS_ID + token + t + string_to_sign, ACCESS_SECRET)
    
    headers = {
        't': t,
        'sign': sign,
        'client_id': ACCESS_ID,
        'access_token': token,
        'sign_method': 'HMAC-SHA256'
    }
    
    try:
        res = requests.get(f"{ENDPOINT}{url}", headers=headers).json()
        if res.get('success'):
            status = res.get('result', [])
            temp, humi = None, None
            for item in status:
                if item['code'] in ['va_temperature', 'temp_current']:
                    val = item['value']
                    temp = val / 10 if val > 100 else val
                if item['code'] in ['va_humidity', 'humidity_value']:
                    val = item['value']
                    humi = val / 10 if val > 100 else val
            
            if temp is not None:
                ts = str(int(time.time() * 1000))
                requests.patch(f"{FIREBASE_URL}/devices/{dev_id}.json", json={"temperature": temp, "humidity": humi, "lastUpdated": now_kst})
                requests.patch(f"{FIREBASE_URL}/history/{dev_id}/{ts}.json", json={"temperature": temp, "humidity": humi})
                requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "temp": temp})
                print(f"✅ 성공: {temp}도")
        else:
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": "fetch_failed", "res": res, "at": now_kst})
    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": str(e), "at": now_kst})

if __name__ == "__main__":
    collect()
