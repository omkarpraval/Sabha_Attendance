import qrcode
import io
import base64

def format_qr_url(data: str, base_url: str = "http://localhost:5173") -> str:
    """Formats raw QR reference into a full website URL for native camera scanning."""
    if not data:
        return ""
    if data.startswith("http://") or data.startswith("https://"):
        return data
    return f"{base_url.rstrip('/')}/?qr_ref={data}"

def generate_qr_base64(data: str, base_url: str = "http://localhost:5173") -> str:
    """Generates a QR code image as a base64 encoded PNG string containing portal URL."""
    url_to_encode = format_qr_url(data, base_url)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url_to_encode)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#3A322C", back_color="#FDFBF7")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    binary_data = buffer.getvalue()
    base64_data = base64.b64encode(binary_data).decode("utf-8")
    return f"data:image/png;base64,{base64_data}"
