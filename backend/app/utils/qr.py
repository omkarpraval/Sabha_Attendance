import qrcode
import io
import base64

def generate_qr_base64(data: str) -> str:
    """Generates a QR code image as a base64 encoded PNG string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#3A322C", back_color="#FDFBF7")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    binary_data = buffer.getvalue()
    base64_data = base64.b64encode(binary_data).decode("utf-8")
    return f"data:image/png;base64,{base64_data}"
