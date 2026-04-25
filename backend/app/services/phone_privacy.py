import base64
import hashlib
import re

from cryptography.fernet import Fernet

from app.core.config import settings


PHONE_SANITIZER = re.compile(r"[\s().-]+")


def normalize_phone(phone: str) -> str:
    normalized = PHONE_SANITIZER.sub("", (phone or "").strip())
    return normalized


def derive_phone_hash(phone: str) -> str:
    normalized_phone = normalize_phone(phone)
    secret = settings.PHONE_ENCRYPTION_SECRET or settings.SECRET_KEY
    payload = f"{secret}|{normalized_phone}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _build_fernet() -> Fernet:
    secret = settings.PHONE_ENCRYPTION_SECRET or settings.SECRET_KEY
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_phone(phone: str) -> str:
    normalized_phone = normalize_phone(phone)
    return _build_fernet().encrypt(normalized_phone.encode("utf-8")).decode("utf-8")


def decrypt_phone(ciphertext: str) -> str:
    return _build_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")


def mask_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) > 10:
        digits = digits[-10:]
    if len(digits) < 7:
        return phone or "-"
    return f"{digits[:3]}****{digits[-3:]}"
