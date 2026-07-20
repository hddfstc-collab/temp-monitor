import requests
import time
import datetime
import hmac
import hashlib

ACCESS_ID = "rqyqdefgxpq8akws93xe"
ACCESS_SECRET = "ba86766479ee4a08a9426e7fe7e620b9" 
FIREBASE_URL = "https://temp-monitoring-8b172-default-rtdb.asia-southeast1.firebasedatabase.app"
ENDPOINT = "https://openapi.tuyaus.com"

def get_sign(content, secret):
    return hmac.new(secret.encode(), content.encode(), hashlib.sha256).hexdigest().upper()

def collect():
    now_kst = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y.%m.%d %p %I:%M:%S')
    t = str(int(time.time() * 1000))

    try:
        # 파이어베이스에서 등록된 모든 기기 목록을 가져옴
        devices_res = requests.get(f"{FIREBASE_URL}/devices.json").json()
        if not devices_res: return
        
        # 토큰 발급
        token_sign = get_sign(ACCESS_ID + t, ACCESS_SECRET)
        token_headers = {'t': t, 'sign': token_sign, 'client_id': ACCESS_ID, 'sign_method': 'HMAC-SHA256'}
        token_res = requests.get(f"{ENDPOINT}/v1.0/token?grant_type=1", headers=token_headers).json()

        if not token_res.get('success'): return
        token = token_res['result']['access_token']

        # 기기별 루프
        for device_id in devices_res.keys():
            t = str(int(time.time() * 1000))
            url = f"/v1.0/devices/{device_id}/status"
            content_sha256 = hashlib.sha256("".encode('utf-8')).hexdigest()
            string_to_sign = f"GET\n{content_sha256}\n\n{url}"
            data_sign = get_sign(ACCESS_ID + token + t + string_to_sign, ACCESS_SECRET)

            data_headers = {'t': t, 'sign': data_sign, 'client_id': ACCESS_ID, 'access_token': token, 'sign_method': 'HMAC-SHA256'}
            data_res = requests.get(f"{ENDPOINT}{url}", headers=data_headers).json()

            if data_res.get('success'):
                status_list = data_res.get('result', [])
                temp = next((item['value'] for item in status_list if item['code'] in ['va_temperature', 'temp_current']), 0)
                humi = next((item['value'] for item in status_list if item['code'] in ['va_humidity', 'humidity_value']), 0)
                if temp > 100: temp /= 10
                requests.patch(f"{FIREBASE_URL}/devices/{device_id}.json", json={"temperature": temp, "humidity": humi, "lastUpdated": now_kst})
        
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"last_success": now_kst, "status": "OK"})
    except Exception as e:
        requests.patch(f"{FIREBASE_URL}/debug.json", json={"error": str(e), "at": now_kst})

if __name__ == "__main__":
    collect()
