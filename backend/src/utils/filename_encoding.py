def normalize_possible_mojibake(value: str) -> str:
    if not isinstance(value, str):
        return value

    try:
        decoded = value.encode("latin1").decode("utf-8")
        round_trip = decoded.encode("utf-8").decode("latin1")
        return decoded if round_trip == value else value
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value
