import requests
import time
import datetime
import hmac
import hashlib

# Access Secret을 복사하실 때 따옴표 안쪽에 공백이 없는지 꼭 확인해주세요!
ACCESS_ID = "rqyqdefgxpq8akws93xe" 
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com" 

def get_tuya_token():
    t = str(int(time.time() * 1000))
    # 서명 생성 로직 재정비
    sign_content = ACCESS_ID + t
    sign = hmac.new(ACCESS_SECRET.encode(), sign_content.encode(), hashlib.sha256).hexdigest().upper()
    
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
        else:
            # 실패 시 이유를 파이어베이스에 더 자세히 남깁니다.
            return f"Error: {res.get('msg')}"
    except Exception as e:
        return f"Exception: {str(e)}"

def collect():
    token_res = get_tuya_token()
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y. %m. %d. %p %I:%M:%S')

    if not token_res or "Error" in str(token_res) or "Exception" in str(token_res):
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": token_res, "at": now_kst})
        return

    token = token_res
    dev_id = "eb0b4a165182f9fd92d7yb" 
    t = str(int(time.time() * 1000))
    url = f"/v1.0/devices/{dev_id}/status"
    
    content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
    string_to_sign = f"GET\n{content_sha256}\n\n{url}"
    sign_content = ACCESS_ID + token + t + string_to_sign
    sign = hmac.new(ACCESS_SECRET.encode(), sign_content.encode(), hashlib.sha256).hexdigest().upper()
    
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
    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error_collect": str(e), "at": now_kst})

if __name__ == "__main__":
    collect()
