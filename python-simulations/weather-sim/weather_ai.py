"""
Weather AI - Intelligent Prediction & Alert System
Dự báo và cảnh báo thông minh dựa trên dữ liệu thời tiết
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class WeatherAI:
    """AI-based weather prediction and alert system"""
    
    @staticmethod
    def predict_tropical_storm(weather_data: Dict) -> Dict:
        """
        1. Dự báo bão / áp thấp nhiệt đới
        Phân tích: áp suất, gió, nhiệt độ nước biển
        """
        pressure = weather_data.get('pressure', 1013)
        wind_speed = weather_data.get('wind', {}).get('speed', 0)
        temp = weather_data.get('temperature', {}).get('current', 25)
        humidity = weather_data.get('humidity', 50)
        
        # Indicators
        low_pressure = pressure < 1000  # mb
        high_wind = wind_speed > 15  # m/s
        warm_water = temp > 26  # °C
        high_humidity = humidity > 70  # %
        
        # Risk calculation
        risk_score = 0
        if low_pressure: risk_score += 30
        if high_wind: risk_score += 25
        if warm_water: risk_score += 25
        if high_humidity: risk_score += 20
        
        # Predict direction based on Coriolis effect (simplified)
        hemisphere = 'north' if weather_data.get('coordinates', {}).get('lat', 0) > 0 else 'south'
        predicted_direction = 'west-northwest' if hemisphere == 'north' else 'west-southwest'
        
        return {
            'risk_level': 'high' if risk_score > 70 else 'medium' if risk_score > 40 else 'low',
            'risk_score': risk_score,
            'indicators': {
                'low_pressure': low_pressure,
                'high_wind': high_wind,
                'warm_water': warm_water,
                'high_humidity': high_humidity
            },
            'predicted_direction': predicted_direction,
            'recommendations': [
                '📡 Theo dõi dự báo liên tục',
                '🏠 Chằng chống nhà cửa' if risk_score > 50 else None,
                '🚶 Chuẩn bị di dân nếu cần' if risk_score > 70 else None,
                '🎒 Dự trữ lương thực, nước uống',
                '📞 Cập nhật kế hoạch ứng phó'
            ],
            'severity': get_severity(risk_score)
        }
    
    @staticmethod
    def predict_flash_flood(forecast_data: List[Dict], terrain_type: str = 'urban') -> Dict:
        """
        2. Cảnh báo mưa lớn / lũ quét
        Phân tích: lượng mưa dự báo, địa hình, thoát nước
        """
        total_rain = sum(f.get('pop', 0) for f in forecast_data[:8])  # Next 24h
        max_rain_intensity = max(f.get('pop', 0) for f in forecast_data[:8])
        
        # Terrain factors
        terrain_risk = {
            'urban': 1.5,      # Đô thị - thoát nước kém
            'mountain': 2.0,   # Núi - lũ quét nguy hiểm
            'coastal': 1.3,    # Ven biển
            'plains': 0.8      # Đồng bằng
        }
        
        risk_multiplier = terrain_risk.get(terrain_type, 1.0)
        flood_risk = (total_rain * max_rain_intensity * risk_multiplier) / 100
        
        return {
            'flood_probability': min(100, flood_risk),
            'total_rainfall_forecast': total_rain,
            'max_intensity': max_rain_intensity,
            'terrain_type': terrain_type,
            'risk_level': 'critical' if flood_risk > 70 else 'high' if flood_risk > 50 else 'medium' if flood_risk > 30 else 'low',
            'warnings': [
                '⚠️ Nguy cơ ngập úng cao' if flood_risk > 60 else None,
                '🚫 Tránh di chuyển qua vùng trũng' if flood_risk > 50 else None,
                '📱 Theo dõi cảnh báo địa phương',
                '🏠 Chuẩn bị thiết bị thoát nước' if terrain_type == 'urban' else None
            ],
            'affected_hours': estimate_affected_hours(forecast_data)
        }
    
    @staticmethod
    def calculate_infrastructure_damage(wind_speed: float, building_type: str = 'residential') -> Dict:
        """
        3. Tính toán thiệt hại & rủi ro hạ tầng
        Phân tích áp lực gió lên công trình
        """
        # Wind pressure: P = 0.5 * ρ * v²
        # ρ (air density) ≈ 1.225 kg/m³
        wind_pressure = 0.5 * 1.225 * (wind_speed ** 2)  # Pa
        
        # Building vulnerability
        vulnerability = {
            'residential': 1.0,      # Nhà dân
            'high_rise': 0.7,        # Cao tầng (thiết kế tốt hơn)
            'warehouse': 1.3,        # Nhà kho (mái rộng)
            'temporary': 2.0         # Công trình tạm
        }
        
        v_factor = vulnerability.get(building_type, 1.0)
        damage_index = (wind_pressure * v_factor) / 1000  # Normalized
        
        return {
            'wind_speed': wind_speed,
            'wind_pressure': float(wind_pressure),
            'building_type': building_type,
            'damage_probability': min(100, damage_index * 10),
            'risk_category': 'extreme' if wind_speed > 50 else 'high' if wind_speed > 30 else 'moderate' if wind_speed > 20 else 'low',
            'recommendations': [
                '🏗️ Kiểm tra kết cấu công trình' if wind_speed > 30 else None,
                '⚠️ Sơ tán nếu công trình yếu' if damage_index > 50 else None,
                '🔧 Gia cố cửa sổ, mái nhà',
                '📊 Đánh giá sau bão' if wind_speed > 40 else None
            ],
            'estimated_force': float(wind_pressure * 10)  # N/m² example
        }
    
    @staticmethod
    def predict_wind_energy(wind_data: List[Dict]) -> Dict:
        """
        4. Khai thác năng lượng gió
        Dự đoán công suất turbine
        """
        # Typical turbine specs
        rotor_diameter = 80  # meters
        rotor_area = np.pi * (rotor_diameter / 2) ** 2
        efficiency = 0.4  # Betz limit ≈ 0.59, real ≈ 0.35-0.45
        
        power_outputs = []
        for data in wind_data:
            wind_speed = data.get('wind_speed', 0)
            
            # Power = 0.5 * ρ * A * v³ * efficiency
            # ρ = 1.225 kg/m³
            power = 0.5 * 1.225 * rotor_area * (wind_speed ** 3) * efficiency
            power_kw = power / 1000
            
            power_outputs.append({
                'timestamp': data.get('timestamp', ''),
                'wind_speed': wind_speed,
                'power_kw': float(power_kw),
                'capacity_factor': min(100, power_kw / 2000 * 100)  # 2MW rated
            })
        
        avg_power = np.mean([p['power_kw'] for p in power_outputs])
        
        return {
            'turbine_specs': {
                'rotor_diameter': rotor_diameter,
                'rated_power': 2000,  # kW
                'efficiency': efficiency
            },
            'predictions': power_outputs,
            'statistics': {
                'avg_power': float(avg_power),
                'max_power': float(max(p['power_kw'] for p in power_outputs)),
                'capacity_factor': float(avg_power / 2000 * 100),
                'annual_energy_estimate': float(avg_power * 24 * 365)  # kWh/year
            },
            'optimization': {
                'optimal_height': 80,  # meters
                'recommended_location': 'coastal' if avg_power > 500 else 'highland'
            }
        }
    
    @staticmethod
    def agriculture_water_forecast(forecast_data: List[Dict], crop_type: str = 'rice') -> Dict:
        """
        5. Quản lý nông nghiệp & tài nguyên nước
        Dự báo cho canh tác
        """
        # Calculate total rainfall
        total_rain = sum(f.get('pop', 0) * f.get('rain_mm', 5) for f in forecast_data)
        
        # Crop water requirements (mm/day)
        crop_requirements = {
            'rice': 7,
            'corn': 5,
            'wheat': 4,
            'vegetables': 6
        }
        
        daily_need = crop_requirements.get(crop_type, 5)
        days = len(forecast_data) / 8  # 8 forecasts per day
        total_need = daily_need * days
        
        water_balance = total_rain - total_need
        
        return {
            'crop_type': crop_type,
            'forecast_period_days': int(days),
            'total_rainfall_mm': float(total_rain),
            'water_requirement_mm': float(total_need),
            'water_balance': float(water_balance),
            'status': 'surplus' if water_balance > 20 else 'adequate' if water_balance > -10 else 'deficit',
            'recommendations': [
                '💧 Cần tưới bổ sung' if water_balance < -10 else None,
                '🌾 Điều kiện thuận lợi' if water_balance > 10 else None,
                '⚠️ Nguy cơ hạn hán' if water_balance < -30 else None,
                '💦 Chuẩn bị thoát nước' if total_rain > total_need * 1.5 else None
            ],
            'irrigation_plan': generate_irrigation_plan(water_balance, crop_type)
        }
    
    @staticmethod
    def earthquake_early_warning(earthquake: Dict) -> Dict:
        """
        6. Hệ thống cảnh báo động đất
        Phân tích và cảnh báo
        """
        magnitude = earthquake.get('magnitude', 0)
        depth = earthquake.get('coordinates', {}).get('depth', 0)
        tsunami_flag = earthquake.get('tsunami', 0)
        
        # Calculate affected radius (simplified)
        affected_radius_km = magnitude * 50
        
        # Intensity at surface (Modified Mercalli Intensity)
        if depth < 10:
            surface_intensity = magnitude + 1
        elif depth < 30:
            surface_intensity = magnitude
        else:
            surface_intensity = magnitude - 0.5
        
        return {
            'magnitude': magnitude,
            'depth_km': depth,
            'surface_intensity': float(surface_intensity),
            'affected_radius_km': float(affected_radius_km),
            'tsunami_warning': bool(tsunami_flag),
            'severity': 'extreme' if magnitude >= 7 else 'severe' if magnitude >= 6 else 'moderate' if magnitude >= 5 else 'minor',
            'alerts': [
                '🚨 Nguy hiểm cực độ - Sơ tán ngay!' if magnitude >= 7 else None,
                '⚠️ Tìm nơi trú ẩn an toàn' if magnitude >= 5 else None,
                '🌊 Cảnh báo sóng thần' if tsunami_flag else None,
                '🏗️ Kiểm tra công trình sau chấn động',
                '📱 Theo dõi dư chấn'
            ],
            'shakemap_url': earthquake.get('url', ''),
            'response_actions': generate_earthquake_response(magnitude, depth, tsunami_flag)
        }
    
    @staticmethod
    def detect_severe_weather(weather_data: Dict, forecast: List[Dict]) -> Dict:
        """
        7. Phát hiện thời tiết cực đoan
        Đối lưu, sấm chớp, lốc xoáy
        """
        current_temp = weather_data.get('temperature', {}).get('current', 25)
        humidity = weather_data.get('humidity', 50)
        pressure = weather_data.get('pressure', 1013)
        wind_speed = weather_data.get('wind', {}).get('speed', 0)
        
        # Check for severe weather conditions
        severe_indicators = {
            'rapid_pressure_drop': pressure < 995,
            'high_humidity': humidity > 80,
            'strong_winds': wind_speed > 20,
            'temperature_unstable': abs(current_temp - 25) > 10
        }
        
        # Count indicators
        active_indicators = sum(severe_indicators.values())
        
        return {
            'severe_weather_probability': min(100, active_indicators * 25),
            'indicators': severe_indicators,
            'types': {
                'thunderstorm': severe_indicators['high_humidity'] and severe_indicators['rapid_pressure_drop'],
                'tornado_possible': severe_indicators['rapid_pressure_drop'] and severe_indicators['strong_winds'],
                'hail_risk': severe_indicators['temperature_unstable']
            },
            'warnings': [
                '⛈️ Nguy cơ sấm chớp cao' if active_indicators >= 2 else None,
                '🌪️ Có thể có lốc xoáy' if active_indicators >= 3 else None,
                '🏠 Ở trong nhà, tránh xa cửa sổ',
                '🚗 Tránh đi lại nếu không cần thiết' if active_indicators >= 2 else None
            ]
        }
    
    @staticmethod
    def transportation_impact_analysis(weather_data: Dict) -> Dict:
        """
        8. Ảnh hưởng giao thông & logistics
        Đánh giá điều kiện di chuyển
        """
        visibility = weather_data.get('visibility', 10000) / 1000  # km
        wind_speed = weather_data.get('wind', {}).get('speed', 0)
        rain = weather_data.get('weather', {}).get('main', '').lower()
        
        # Aviation impact
        flight_safe = visibility > 5 and wind_speed < 20
        
        # Road impact
        road_conditions = 'good'
        if 'rain' in rain and wind_speed > 15:
            road_conditions = 'dangerous'
        elif 'rain' in rain or wind_speed > 10:
            road_conditions = 'caution'
        
        # Maritime impact
        sea_conditions = 'calm' if wind_speed < 10 else 'rough' if wind_speed < 20 else 'very_rough'
        
        return {
            'aviation': {
                'safe_for_flight': flight_safe,
                'visibility_km': float(visibility),
                'wind_speed_ms': wind_speed,
                'recommendation': 'Clear for takeoff' if flight_safe else 'Delays expected'
            },
            'road': {
                'conditions': road_conditions,
                'speed_reduction': 0 if road_conditions == 'good' else 20 if road_conditions == 'caution' else 40,
                'recommendation': get_road_recommendation(road_conditions)
            },
            'maritime': {
                'sea_state': sea_conditions,
                'safe_for_sailing': wind_speed < 15,
                'wave_height_estimate': wind_speed / 5  # Rough estimate
            },
            'overall_impact': 'severe' if not flight_safe and road_conditions == 'dangerous' else 'moderate' if road_conditions != 'good' else 'minimal'
        }
    
    @staticmethod
    def insurance_risk_assessment(location_data: Dict, historical_events: List[Dict]) -> Dict:
        """
        9. Bảo hiểm thiên tai / rủi ro tài chính
        Đánh giá rủi ro cho bảo hiểm
        """
        # Count severe events in past
        severe_count = len([e for e in historical_events if e.get('magnitude', 0) > 5 or e.get('wind', 0) > 30])
        
        # Location risk factors
        coastal = location_data.get('coastal', False)
        earthquake_zone = location_data.get('earthquake_zone', False)
        flood_prone = location_data.get('flood_prone', False)
        
        # Calculate premium factors
        base_premium = 1.0
        if coastal: base_premium *= 1.5
        if earthquake_zone: base_premium *= 1.3
        if flood_prone: base_premium *= 1.4
        if severe_count > 5: base_premium *= 1.2
        
        return {
            'risk_score': min(100, base_premium * 20),
            'premium_multiplier': float(base_premium),
            'risk_factors': {
                'coastal_exposure': coastal,
                'seismic_activity': earthquake_zone,
                'flood_vulnerability': flood_prone,
                'historical_events': severe_count
            },
            'recommended_coverage': {
                'earthquake_insurance': earthquake_zone,
                'flood_insurance': flood_prone or coastal,
                'wind_damage': coastal,
                'comprehensive': base_premium > 1.5
            },
            'estimated_annual_premium': float(base_premium * 500)  # USD example
        }
    
    @staticmethod
    def generate_public_education_scenario(weather_type: str, severity: str) -> Dict:
        """
        10. Giáo dục và mô phỏng công chúng
        Tạo kịch bản giáo dục
        """
        scenarios = {
            'typhoon': {
                'title': 'Mô phỏng Bão nhiệt đới',
                'description': 'Xem đường đi của bão và chuẩn bị ứng phó',
                'visualization': '3D storm path animation',
                'learning_points': [
                    '🌀 Cấu trúc của bão nhiệt đới',
                    '📍 Dự báo đường đi',
                    '💨 Phân vùng gió mạnh',
                    '🏠 Cách bảo vệ nhà cửa',
                    '🚶 Kế hoạch sơ tán'
                ]
            },
            'earthquake': {
                'title': 'Mô phỏng Động đất',
                'description': 'Hiểu cách sóng địa chấn lan truyền',
                'visualization': 'Seismic wave propagation',
                'learning_points': [
                    '📊 Thang độ Richter',
                    '🌊 Nguy cơ sóng thần',
                    '🏗️ Thiết kế chống chấn',
                    '🆘 Hành động khi động đất',
                    '📱 Hệ thống cảnh báo sớm'
                ]
            },
            'flood': {
                'title': 'Mô phỏng Lũ lụt',
                'description': 'Dự báo ngập úng và ứng phó',
                'visualization': 'Flood inundation map',
                'learning_points': [
                    '💧 Nguyên nhân lũ quét',
                    '🗺️ Bản đồ nguy cơ ngập',
                    '🏠 Bảo vệ tài sản',
                    '🚣 Phương án thoát hiểm',
                    '📞 Liên hệ cứu hộ'
                ]
            }
        }
        
        scenario = scenarios.get(weather_type, scenarios['typhoon'])
        scenario['severity'] = severity
        scenario['interactive_elements'] = [
            'Adjust parameters (wind speed, direction)',
            'See predicted impact zones',
            'Test your evacuation plan',
            'Learn safety protocols'
        ]
        
        return scenario


def get_severity(score: float) -> str:
    """Get severity level from score"""
    if score > 80: return 'critical'
    if score > 60: return 'high'
    if score > 40: return 'moderate'
    return 'low'


def estimate_affected_hours(forecast_data: List[Dict]) -> int:
    """Estimate hours affected by rain"""
    return len([f for f in forecast_data if f.get('pop', 0) > 50])


def get_road_recommendation(conditions: str) -> str:
    """Get road safety recommendation"""
    recommendations = {
        'good': 'An toàn di chuyển',
        'caution': 'Giảm tốc độ, cẩn thận',
        'dangerous': 'Hạn chế di chuyển, chỉ khi cần thiết'
    }
    return recommendations.get(conditions, 'Kiểm tra điều kiện')


def generate_irrigation_plan(water_balance: float, crop_type: str) -> List[str]:
    """Generate irrigation schedule"""
    if water_balance < -30:
        return ['Tưới 2 lần/ngày', 'Kiểm tra độ ẩm đất', 'Sử dụng mulch']
    elif water_balance < -10:
        return ['Tưới 1 lần/ngày', 'Theo dõi thời tiết']
    elif water_balance > 30:
        return ['Tạm dừng tưới', 'Cải thiện thoát nước', 'Chống úng']
    else:
        return ['Tưới theo lịch thường', 'Điều chỉnh theo thực tế']


def generate_earthquake_response(magnitude: float, depth: float, tsunami: bool) -> List[str]:
    """Generate earthquake response actions"""
    actions = []
    
    if magnitude >= 7:
        actions.extend([
            '🚨 Sơ tán khẩn cấp khỏi công trình cao',
            '🏕️ Thiết lập trại cứu trợ',
            '🚑 Huy động đội cứu hộ'
        ])
    elif magnitude >= 5:
        actions.extend([
            '🏠 Kiểm tra kết cấu nhà',
            '📦 Chuẩn bị vật dụng khẩn cấp'
        ])
    
    if tsunami:
        actions.extend([
            '🌊 Di chuyển lên cao ngay lập tức',
            '📢 Cảnh báo cộng đồng ven biển'
        ])
    
    if depth < 10:
        actions.append('⚠️ Dư chấn mạnh có thể xảy ra')
    
    return actions


