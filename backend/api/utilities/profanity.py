import re

BAD_WORDS = [
    "puta", "tangina", "gago", "bobo", "ulol",
    "fuck", "shit", "bitch", "asshole"
]

BAD_WORDS_REGEX = re.compile(
    r"|".join(re.escape(word) for word in BAD_WORDS),
    re.IGNORECASE
)

def contains_profanity(text: str) -> bool:
    if not text:
        return False
    return bool(BAD_WORDS_REGEX.search(text.lower()))
