from enum import Enum

class Category(str, Enum):
    ROAD = "road"
    WATER = "water"
    SANITATION = "sanitation"
    ELECTRICAL = "electrical"
    SEWERAGE = "sewerage"
    TRAFFIC = "traffic"
    PUBLIC_SAFETY = "public_safety"
    HEALTHCARE = "healthcare"
    EMERGENCY = "emergency"
    OTHER = "other"

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Department(str, Enum):
    PWD = "pwd"
    WATER_BOARD = "water_board"
    SANITATION = "sanitation"
    ELECTRICITY_BOARD = "electricity_board"
    SEWERAGE = "sewerage"
    TRAFFIC_POLICE = "traffic_police"
    POLICE = "police"
    HEALTH = "health"
    OTHER = "other"
