"""
Behavioral Analysis Engine.

Detects anomalies in user behavior patterns:
- Impossible travel (physically impossible location changes)
- Transaction velocity (rapid-fire spending)
- Time-based anomalies (unusual hours)
- Amount anomalies (deviations from user norms)
"""

from datetime import datetime, timedelta
from typing import Optional
from app.models import BehavioralReport, BehavioralAnomaly


# Simulated IP-to-location mapping for demo
# In production, use MaxMind GeoIP or ip-api.com
IP_GEO_MAP: dict[str, tuple[str, float, float]] = {
    # (city, latitude, longitude)
    "192.168.1.1":      ("New York", 40.7128, -74.0060),
    "192.168.1.2":      ("New York", 40.7128, -74.0060),
    "10.0.0.1":         ("San Francisco", 37.7749, -122.4194),
    "10.0.0.2":         ("Los Angeles", 34.0522, -118.2437),
    "185.220.101.45":   ("Moscow", 55.7558, 37.6173),
    "91.219.237.22":    ("Kyiv", 50.4501, 30.5234),
    "23.129.64.100":    ("Amsterdam", 52.3676, 4.9041),
    "103.21.244.10":    ("Mumbai", 19.0760, 72.8777),
    "175.45.176.1":     ("Pyongyang", 39.0392, 125.7625),
    "200.160.2.3":      ("São Paulo", -23.5505, -46.6333),
    "8.8.8.8":          ("Mountain View", 37.3861, -122.0839),
    "1.1.1.1":          ("Sydney", -33.8688, 151.2093),
    "45.33.32.156":     ("London", 51.5074, -0.1278),
    "172.16.0.1":       ("Chicago", 41.8781, -87.6298),
    "172.16.0.2":       ("Dallas", 32.7767, -96.7970),
}


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points on Earth in kilometers."""
    import math
    R = 6371  # Earth's radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _get_location(ip_address: str) -> Optional[tuple[str, float, float]]:
    """Look up geolocation for an IP address."""
    return IP_GEO_MAP.get(ip_address)


class BehavioralAnalyzer:
    """
    Tracks user behavior patterns and detects anomalies.
    Maintains a sliding window of recent activity per user.
    """

    def __init__(self):
        # user_id -> list of (timestamp, ip_address, amount)
        self._user_history: dict[str, list[tuple[datetime, str, float]]] = {}

        # Seed with some transaction history for demo realism
        self._seed_history()

    def _seed_history(self):
        """Pre-populate some users with history for demo."""
        base_time = datetime.utcnow() - timedelta(hours=2)

        self._user_history["user_42"] = [
            (base_time - timedelta(hours=3), "192.168.1.1", 25.00),
            (base_time - timedelta(hours=2), "192.168.1.1", 50.00),
            (base_time - timedelta(hours=1), "192.168.1.2", 30.00),
        ]

        self._user_history["user_77"] = [
            (base_time - timedelta(hours=5), "10.0.0.1", 100.00),
            (base_time - timedelta(hours=3), "10.0.0.1", 200.00),
        ]

    def _record_activity(self, user_id: str, timestamp: datetime, ip_address: str, amount: float):
        """Record a user's activity for future analysis."""
        if user_id not in self._user_history:
            self._user_history[user_id] = []
        self._user_history[user_id].append((timestamp, ip_address, amount))

        # Keep only last 50 transactions per user
        if len(self._user_history[user_id]) > 50:
            self._user_history[user_id] = self._user_history[user_id][-50:]

    def check_impossible_travel(
        self, user_id: str, ip_address: str, timestamp: datetime
    ) -> Optional[BehavioralAnomaly]:
        """
        Detect physically impossible travel.
        If a user transacted from City A and then City B within a timeframe
        that's physically impossible (> 900 km/h), flag it.
        """
        history = self._user_history.get(user_id, [])
        if not history:
            return None

        current_location = _get_location(ip_address)
        if not current_location:
            return None

        current_city, current_lat, current_lon = current_location

        # Check against most recent transaction
        last_time, last_ip, _ = history[-1]
        last_location = _get_location(last_ip)
        if not last_location:
            return None

        last_city, last_lat, last_lon = last_location

        # Calculate distance and time difference
        distance_km = _haversine_distance(last_lat, last_lon, current_lat, current_lon)
        time_diff = abs((timestamp - last_time).total_seconds())

        if time_diff == 0:
            time_diff = 1  # Avoid division by zero

        # Speed in km/h
        speed_kmh = (distance_km / time_diff) * 3600

        # Threshold: 900 km/h (faster than commercial flights including boarding)
        if distance_km > 100 and speed_kmh > 900:
            return BehavioralAnomaly(
                anomaly_type="impossible_travel",
                description=(
                    f"User traveled from {last_city} to {current_city} "
                    f"({distance_km:.0f} km) in {time_diff / 60:.0f} minutes "
                    f"— implied speed of {speed_kmh:.0f} km/h."
                ),
                severity="critical",
                data_points={
                    "from_city": last_city,
                    "to_city": current_city,
                    "distance_km": round(distance_km, 1),
                    "time_minutes": round(time_diff / 60, 1),
                    "implied_speed_kmh": round(speed_kmh, 0),
                },
            )

        # Also flag moderate travel (improbable but not impossible)
        if distance_km > 500 and speed_kmh > 500:
            return BehavioralAnomaly(
                anomaly_type="improbable_travel",
                description=(
                    f"Suspicious travel from {last_city} to {current_city} "
                    f"({distance_km:.0f} km) in {time_diff / 60:.0f} minutes."
                ),
                severity="high",
                data_points={
                    "from_city": last_city,
                    "to_city": current_city,
                    "distance_km": round(distance_km, 1),
                    "time_minutes": round(time_diff / 60, 1),
                    "implied_speed_kmh": round(speed_kmh, 0),
                },
            )

        return None

    def check_velocity(
        self, user_id: str, amount: float, timestamp: datetime
    ) -> Optional[BehavioralAnomaly]:
        """
        Detect rapid-fire transactions (velocity abuse).
        Flags if user made > 3 transactions within 5 minutes.
        """
        history = self._user_history.get(user_id, [])
        window = timedelta(minutes=5)

        recent_count = sum(
            1 for t, _, _ in history
            if abs((timestamp - t).total_seconds()) < window.total_seconds()
        )

        if recent_count >= 3:
            return BehavioralAnomaly(
                anomaly_type="velocity",
                description=(
                    f"High-velocity activity: {recent_count + 1} transactions "
                    f"within the last 5 minutes."
                ),
                severity="high",
                data_points={
                    "transaction_count": recent_count + 1,
                    "window_minutes": 5,
                },
            )

        return None

    def check_time_anomaly(self, timestamp: datetime) -> Optional[BehavioralAnomaly]:
        """
        Flag transactions during unusual hours (2 AM - 5 AM).
        Most legitimate transactions don't happen in this window.
        """
        hour = timestamp.hour
        if 2 <= hour <= 5:
            return BehavioralAnomaly(
                anomaly_type="time_anomaly",
                description=f"Transaction at unusual hour: {hour:02d}:{timestamp.minute:02d} UTC.",
                severity="medium",
                data_points={"hour": hour, "minute": timestamp.minute},
            )
        return None

    def check_amount_anomaly(
        self, user_id: str, amount: float
    ) -> Optional[BehavioralAnomaly]:
        """
        Flag transactions that deviate significantly from user's typical amounts.
        """
        history = self._user_history.get(user_id, [])
        if len(history) < 3:
            # Not enough history to establish a baseline
            if amount > 5000:
                return BehavioralAnomaly(
                    anomaly_type="high_amount_new_user",
                    description=f"High-value transaction (${amount:.2f}) from a new/low-history user.",
                    severity="medium",
                    data_points={"amount": amount, "history_count": len(history)},
                )
            return None

        amounts = [a for _, _, a in history]
        avg = sum(amounts) / len(amounts)
        max_hist = max(amounts)

        # Flag if > 5x average or > 2x historical max
        if amount > avg * 5 and amount > 1000:
            return BehavioralAnomaly(
                anomaly_type="amount_anomaly",
                description=(
                    f"Transaction amount (${amount:.2f}) is {amount / avg:.1f}x "
                    f"the user's average (${avg:.2f})."
                ),
                severity="high",
                data_points={
                    "amount": amount,
                    "user_average": round(avg, 2),
                    "user_max": round(max_hist, 2),
                    "multiplier": round(amount / avg, 1),
                },
            )

        return None

    def analyze(
        self,
        user_id: str,
        ip_address: str,
        amount: float,
        timestamp: datetime,
    ) -> BehavioralReport:
        """
        Run all behavioral checks on a transaction.
        Returns a composite behavioral risk report.
        """
        anomalies: list[BehavioralAnomaly] = []

        # Run all checks
        travel = self.check_impossible_travel(user_id, ip_address, timestamp)
        if travel:
            anomalies.append(travel)

        velocity = self.check_velocity(user_id, amount, timestamp)
        if velocity:
            anomalies.append(velocity)

        time_anom = self.check_time_anomaly(timestamp)
        if time_anom:
            anomalies.append(time_anom)

        amount_anom = self.check_amount_anomaly(user_id, amount)
        if amount_anom:
            anomalies.append(amount_anom)

        # Record activity AFTER analysis (so we compare against history)
        self._record_activity(user_id, timestamp, ip_address, amount)

        # Calculate composite behavioral risk score
        severity_weights = {"low": 0.10, "medium": 0.20, "high": 0.35, "critical": 0.50}
        risk_score = sum(severity_weights.get(a.severity, 0.10) for a in anomalies)
        risk_score = min(1.0, risk_score)

        return BehavioralReport(
            behavioral_risk_score=round(risk_score, 4),
            anomalies=anomalies,
            is_anomalous=len(anomalies) > 0,
        )
