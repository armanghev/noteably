from rest_framework.throttling import UserRateThrottle


class UploadRateThrottle(UserRateThrottle):
    """
    Throttle for file uploads.
    """

    scope = "uploads"


class BurstRateThrottle(UserRateThrottle):
    """
    Throttle for burst requests (e.g., status checks).
    """

    scope = "burst"
