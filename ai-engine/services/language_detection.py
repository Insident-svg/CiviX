import re

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")
_LATIN = re.compile(r"[A-Za-z]")
_HINGLISH_MARKERS = {"hai","ke","ka","ki","ko","mein","me","par","paas","bahut","bada","badi","nahi","nahin","ho","raha","rha","saf","sadak","paani","pani","kachra","light"}

def detect_language(text: str) -> str:
    if not text.strip():
        return "English"
    devanagari = len(_DEVANAGARI.findall(text))
    latin = len(_LATIN.findall(text))
    if devanagari > 0 and devanagari >= latin * 0.25:
        return "Hindi"
    words = {w.lower() for w in re.findall(r"[A-Za-z]+", text)}
    if len(words & _HINGLISH_MARKERS) >= 2:
        return "Hinglish"
    return "English"
