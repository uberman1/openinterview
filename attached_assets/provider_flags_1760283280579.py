# Centralized feature flags for provider behaviors.
import os

def flag(name: str, default: str = "") -> str:
    return os.getenv(name, default)

def as_bool(name: str, default: bool=False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.lower() in ("1","true","yes","on")

class Flags:
    STRIPE_MOCK = as_bool("STRIPE_MOCK", True)
    STRIPE_TEST = as_bool("STRIPE_TEST", False)
    NOTIFY_MODE = os.getenv("NOTIFY_MODE", "mock")  # mock | sandbox | live
    FEATURE_SHADOW_CALLS = as_bool("FEATURE_SHADOW_CALLS", False)
