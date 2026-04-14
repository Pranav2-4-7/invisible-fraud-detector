"""
Transaction Stream Simulator.

Generates a realistic mix of legitimate and fraudulent transactions
to demonstrate the fraud detection pipeline in real-time.
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import Optional

from app.models import TransactionInput


# ──────────────────────────────────────────────
# Simulation Configuration
# ──────────────────────────────────────────────

LEGITIMATE_USERS = [
    "user_alice", "user_bob", "user_carol", "user_david",
    "user_eva", "user_frank", "user_grace", "user_henry",
]

FRAUD_USERS = [
    "user_fraud_01", "user_fraud_02", "user_fraud_03",
    "user_syndicate_a", "user_syndicate_b",
]

NORMAL_DEVICES = [
    "dev_iphone14_a", "dev_pixel8_b", "dev_macbook_c",
    "dev_samsung_d", "dev_ipad_e", "dev_thinkpad_f",
]

FRAUD_DEVICES = [
    "dev_abc123",    # Known flagged device
    "dev_xyz789",    # Known flagged device
    "dev_spoofed_01",
]

NORMAL_IPS = [
    "192.168.1.1", "192.168.1.2", "10.0.0.1", "10.0.0.2",
    "8.8.8.8", "1.1.1.1", "172.16.0.1", "172.16.0.2",
]

SUSPICIOUS_IPS = [
    "185.220.101.45",   # Known Tor exit node
    "91.219.237.22",    # Proxy service
    "23.129.64.100",    # Flagged VPN
    "175.45.176.1",     # Suspicious origin
]

MERCHANTS = [
    "Amazon", "Starbucks", "Netflix", "Uber",
    "Apple Store", "Walmart", "Gas Station #42",
    "CryptoExchange_X", "OffshoreBet_777", "AnonymousGift_Co",
]


def _generate_legitimate_transaction() -> TransactionInput:
    """Generate a normal-looking transaction."""
    return TransactionInput(
        user_id=random.choice(LEGITIMATE_USERS),
        amount=round(random.uniform(5.00, 250.00), 2),
        ip_address=random.choice(NORMAL_IPS),
        device_id=random.choice(NORMAL_DEVICES),
        timestamp=datetime.utcnow(),
        merchant=random.choice(MERCHANTS[:7]),  # Normal merchants
        currency="USD",
    )


def _generate_suspicious_transaction() -> TransactionInput:
    """Generate a transaction with fraud indicators."""
    scenario = random.choice([
        "shared_device",
        "suspicious_ip",
        "impossible_travel",
        "high_velocity",
        "odd_hours_high_amount",
    ])

    if scenario == "shared_device":
        # Use a device that known fraudsters have used
        return TransactionInput(
            user_id=random.choice(LEGITIMATE_USERS + ["user_new_" + str(random.randint(100, 999))]),
            amount=round(random.uniform(500.00, 9999.99), 2),
            ip_address=random.choice(SUSPICIOUS_IPS),
            device_id=random.choice(FRAUD_DEVICES),
            timestamp=datetime.utcnow(),
            merchant=random.choice(MERCHANTS[-3:]),  # Sketchy merchants
            currency="USD",
        )

    elif scenario == "suspicious_ip":
        # Normal user but from a known bad IP
        return TransactionInput(
            user_id=random.choice(LEGITIMATE_USERS),
            amount=round(random.uniform(1000.00, 5000.00), 2),
            ip_address=random.choice(SUSPICIOUS_IPS),
            device_id=random.choice(NORMAL_DEVICES),
            timestamp=datetime.utcnow(),
            merchant=random.choice(MERCHANTS[-3:]),
            currency="USD",
        )

    elif scenario == "impossible_travel":
        # Known user but from a wildly different location
        return TransactionInput(
            user_id="user_42",  # Has history in New York
            amount=round(random.uniform(200.00, 3000.00), 2),
            ip_address="103.21.244.10",  # Mumbai — impossible travel from NY
            device_id=random.choice(NORMAL_DEVICES),
            timestamp=datetime.utcnow(),
            merchant=random.choice(MERCHANTS),
            currency="USD",
        )

    elif scenario == "high_velocity":
        # Fraud user doing rapid transactions
        return TransactionInput(
            user_id=random.choice(FRAUD_USERS),
            amount=round(random.uniform(50.00, 500.00), 2),
            ip_address=random.choice(SUSPICIOUS_IPS + NORMAL_IPS),
            device_id=random.choice(FRAUD_DEVICES),
            timestamp=datetime.utcnow(),
            merchant=random.choice(MERCHANTS),
            currency="USD",
        )

    else:  # odd_hours_high_amount
        # High amount at 3 AM
        odd_time = datetime.utcnow().replace(hour=3, minute=random.randint(0, 59))
        return TransactionInput(
            user_id=random.choice(LEGITIMATE_USERS + FRAUD_USERS),
            amount=round(random.uniform(2000.00, 15000.00), 2),
            ip_address=random.choice(SUSPICIOUS_IPS),
            device_id=random.choice(NORMAL_DEVICES + FRAUD_DEVICES),
            timestamp=odd_time,
            merchant="CryptoExchange_X",
            currency="USD",
        )


def generate_transaction(fraud_probability: float = 0.20) -> TransactionInput:
    """
    Generate a single transaction.
    
    Args:
        fraud_probability: Chance of generating a suspicious transaction (0.0 - 1.0)
    """
    if random.random() < fraud_probability:
        return _generate_suspicious_transaction()
    return _generate_legitimate_transaction()


async def run_simulation(
    callback,
    interval_seconds: float = 2.0,
    fraud_probability: float = 0.20,
    max_transactions: Optional[int] = None,
):
    """
    Run a continuous transaction simulation.
    
    Args:
        callback: Async function to call with each generated transaction
        interval_seconds: Time between transactions
        fraud_probability: Probability of generating a suspicious transaction
        max_transactions: Max transactions before stopping (None = infinite)
    """
    count = 0
    print(f"\n🚀 Starting transaction simulator")
    print(f"   Interval: {interval_seconds}s | Fraud rate: {fraud_probability:.0%}")
    print(f"   Max transactions: {max_transactions or '∞'}\n")

    while max_transactions is None or count < max_transactions:
        tx = generate_transaction(fraud_probability)
        print(f"📤 [{count + 1}] Generated: {tx.user_id} → ${tx.amount:.2f} | {tx.device_id} | {tx.ip_address}")
        
        await callback(tx)
        count += 1
        await asyncio.sleep(interval_seconds)

    print(f"\n✅ Simulation complete. Generated {count} transactions.")


# ──────────────────────────────────────────────
# Named Attack Scenarios
# ──────────────────────────────────────────────

def generate_scenario_burst(scenario_name: str) -> list[TransactionInput]:
    """
    Generate a burst of transactions for a specific named attack scenario.
    Returns a list of TransactionInput objects that tell a cohesive fraud story.
    """
    now = datetime.utcnow()

    if scenario_name == "botnet_strike":
        # Coordinated attack: multiple 'users' sharing the same device/IP
        return [
            TransactionInput(
                user_id="user_bot_alpha",
                amount=round(random.uniform(800, 3000), 2),
                ip_address="185.220.101.45",  # Tor exit node
                device_id="dev_abc123",        # Known flagged device
                timestamp=now,
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_bot_beta",
                amount=round(random.uniform(1200, 5000), 2),
                ip_address="185.220.101.45",  # Same Tor node
                device_id="dev_abc123",        # Same device!
                timestamp=now + timedelta(seconds=3),
                merchant="OffshoreBet_777",
            ),
            TransactionInput(
                user_id="user_bot_gamma",
                amount=round(random.uniform(500, 2000), 2),
                ip_address="91.219.237.22",   # Proxy service
                device_id="dev_abc123",        # Same device again
                timestamp=now + timedelta(seconds=7),
                merchant="AnonymousGift_Co",
            ),
            TransactionInput(
                user_id="user_bot_delta",
                amount=round(random.uniform(2000, 8000), 2),
                ip_address="23.129.64.100",   # VPN endpoint
                device_id="dev_xyz789",        # Another flagged device
                timestamp=now + timedelta(seconds=12),
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_bot_alpha",  # Alpha returns
                amount=round(random.uniform(4000, 9999), 2),
                ip_address="175.45.176.1",    # Suspicious origin
                device_id="dev_xyz789",
                timestamp=now + timedelta(seconds=18),
                merchant="OffshoreBet_777",
            ),
        ]

    elif scenario_name == "impossible_travel":
        # Same user transacts from NYC, then Moscow, then Mumbai in minutes
        return [
            TransactionInput(
                user_id="user_42",
                amount=125.00,
                ip_address="192.168.1.1",    # New York
                device_id="dev_iphone14_a",
                timestamp=now - timedelta(minutes=5),
                merchant="Starbucks",
            ),
            TransactionInput(
                user_id="user_42",
                amount=6500.00,
                ip_address="185.220.101.45",  # Moscow
                device_id="dev_spoofed_01",
                timestamp=now - timedelta(minutes=2),
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_42",
                amount=3200.00,
                ip_address="103.21.244.10",   # Mumbai
                device_id="dev_spoofed_01",
                timestamp=now,
                merchant="OffshoreBet_777",
            ),
        ]

    elif scenario_name == "money_laundering":
        # Structured deposits slightly under $10,000 reporting threshold
        return [
            TransactionInput(
                user_id="user_launder_01",
                amount=9850.00,
                ip_address="23.129.64.100",
                device_id="dev_thinkpad_f",
                timestamp=now - timedelta(minutes=10),
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_launder_01",
                amount=9720.00,
                ip_address="23.129.64.100",
                device_id="dev_thinkpad_f",
                timestamp=now - timedelta(minutes=5),
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_launder_02",
                amount=9900.00,
                ip_address="91.219.237.22",
                device_id="dev_thinkpad_f",  # Same device, different "user"
                timestamp=now - timedelta(minutes=2),
                merchant="AnonymousGift_Co",
            ),
            TransactionInput(
                user_id="user_launder_03",
                amount=9650.00,
                ip_address="175.45.176.1",
                device_id="dev_thinkpad_f",
                timestamp=now,
                merchant="CryptoExchange_X",
            ),
        ]

    elif scenario_name == "identity_theft":
        # A legitimate user's account is suddenly used from new devices/locations
        return [
            TransactionInput(
                user_id="user_alice",
                amount=4500.00,
                ip_address="185.220.101.45",   # Moscow (Alice is usually in NYC)
                device_id="dev_spoofed_01",     # New device
                timestamp=now - timedelta(minutes=3),
                merchant="Apple Store",
            ),
            TransactionInput(
                user_id="user_alice",
                amount=7800.00,
                ip_address="91.219.237.22",    # Kyiv
                device_id="dev_spoofed_01",
                timestamp=now - timedelta(minutes=1),
                merchant="CryptoExchange_X",
            ),
            TransactionInput(
                user_id="user_alice",
                amount=2200.00,
                ip_address="175.45.176.1",     # Pyongyang
                device_id="dev_xyz789",         # Flagged device
                timestamp=now,
                merchant="AnonymousGift_Co",
            ),
        ]

    elif scenario_name == "rapid_cashout":
        # High-velocity drain of an account
        user = "user_cashout_victim"
        return [
            TransactionInput(
                user_id=user,
                amount=round(random.uniform(1500, 3000), 2),
                ip_address="23.129.64.100",
                device_id="dev_abc123",
                timestamp=now + timedelta(seconds=i * 2),
                merchant=random.choice(["CryptoExchange_X", "OffshoreBet_777", "AnonymousGift_Co"]),
            )
            for i in range(6)
        ]

    return []
