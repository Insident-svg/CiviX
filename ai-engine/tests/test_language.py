from services.language_detection import detect_language

def test_english(): assert detect_language("There is a pothole") == "English"
def test_hinglish(): assert detect_language("NIT gate ke paas road mein pothole hai") == "Hinglish"
def test_hindi(): assert detect_language("सड़क पर बहुत बड़ा गड्ढा है") == "Hindi"
