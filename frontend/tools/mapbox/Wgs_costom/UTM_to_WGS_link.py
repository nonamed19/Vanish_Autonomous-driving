import json
from pyproj import Proj, transform

# UTM 설정 (기존 Zone 52가 아닌 기준점 사용)
wgs84_proj = Proj(proj="latlong", datum="WGS84")
custom_point_proj = Proj(proj="utm", zone=52, datum="WGS84", units="m", south=False)

# 사용자 지정 기준점 (서울 근처)
reference_lat = 37.515
reference_lon = 126.563

# 기준점의 UTM 좌표 계산
reference_easting, reference_northing = transform(wgs84_proj, custom_point_proj, reference_lon, reference_lat)

def utm_to_wgs_custom(easting, northing):
    # 기준점을 더해서 실제 GPS 좌표로 변환
    lon, lat = transform(custom_point_proj, wgs84_proj, easting + reference_easting, northing + reference_northing)
    return [lon, lat]

# 🔹 Node 데이터 변환
with open("node_set.json", "r", encoding="utf-8") as f:
    node_data = json.load(f)

for node in node_data:
    easting, northing, _ = node["point"]
    node["point"] = utm_to_wgs_custom(easting, northing)  # 사용자 기준점 기준으로 변환

# 변환된 데이터 저장
with open("node_set_wgs_custom.json", "w", encoding="utf-8") as f:
    json.dump(node_data, f, indent=4)

print("✅ node_set.json 변환 완료!")

# 🔹 Link 데이터 변환
with open("link_set.json", "r", encoding="utf-8") as f:
    link_data = json.load(f)

for link in link_data:
    link["points"] = [utm_to_wgs_custom(p[0], p[1]) for p in link["points"]]  # 사용자 기준점 기준으로 변환

# 변환된 데이터 저장
with open("link_set_wgs_custom.json", "w", encoding="utf-8") as f:
    json.dump(link_data, f, indent=4)

print("✅ link_set.json 변환 완료!")
