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


def convert_parking_space_set(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        parking_data = json.load(f)

    for parking_space in parking_data:
        # Convert 'points'
        parking_space['points'] = [
            utm_to_wgs_custom(p[0], p[1]) + [p[2]]  # Keep Z-coordinate intact
            for p in parking_space['points']
        ]

        # Convert 'center_point'
        easting, northing, z = parking_space['center_point']
        parking_space['center_point'] = utm_to_wgs_custom(easting, northing) + [z]

    # Save the converted data
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(parking_data, f, indent=4)

    print(f'✅ {input_file} 변환 완료! -> {output_file}')


# 사용 예제
convert_parking_space_set("parking_space_set.json", "parking_space_set_wgs_custom.json")
