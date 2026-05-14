import requests
import time
import datetime
import hmac
import hashlib

# 정보는 그대로 유지합니다.
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com" 

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def get_tuya_token():
    t = str(int(time.time() * 1000))
    # 1. 토큰 발급용 서명 (ID + Timestamp)
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
        return f"Error: {res.get('msg')}"
    except Exception as e:
        return f"Exception: {str(e)}"

def collect():
    token_res = get_tuya_token()
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y. %m. %d. %p %I:%M:%S')

    if not token_res or "Error" in str(token_res) or "Exception" in str(token_res):
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": str(token_res), "at": now_kst})
        return

    token = token_res
    dev_id = "eb0b4a165182f9fd92d7yb" 
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{dev_id}/status"
    
    # 2. 데이터 조회용 서명 (이 로직이 sign invalid의 핵심입니다)
    # 규격: HTTPMethod + "\n" + Content-SHA256 + "\n" + Headers + "\n" + URL
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    
    # 최종 서명: ID + Token + Timestamp + StringToSign
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = get_sign(sign_content, ACCESS_SECRET)
    
    headers = {
        't': t,
        'sign': sign,
        'client_id': ACCESS_ID,
        'access_token': token,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json'
    }
    
    try:
        res = requests.get(f"{ENDPOINT}{url}", headers=headers).json()
        if res.get('success'):
            status = res.get('result', [])
            temp, humi = None, None
            for item in status:
                if item['code'] in ['va_temperature', 'temp_current', 'va_temp']:
                    val = item['value']
                    temp = val / 10 if val > 100 else val
                if item['code'] in ['va_humidity', 'humidity_value', 'va_humi']:
                    val = item['value']
                    humi = val / 10 if val > 100 else val
            
            if temp is not None:
                ts = str(int(time.time() * 1000))
                requests.patch(f"{FIREBASE_URL}/devices/{dev_id}.json", json={"temperature": temp, "humidity": humi, "lastUpdated": now_kst})
                requests.patch(f"{FIREBASE_URL}/history/{dev_id}/{ts}.json", json={"temperature": temp, "humidity": humi})
                requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "temp": temp})
        else:
            # 여기서 sign invalid가 뜨면 메시지를 파이어베이스에 남깁니다.
            requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": res.get('msg'), "full_res": res, "at": now_kst})
    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error_collect": str(e), "at": now_kst})

if __name__ == "__main__":
    collect()
