import os
from PIL import Image, ImageDraw, ImageFont

def create_crisp_deed(output_path):
    width, height = 1200, 1600
    img = Image.new('RGB', (width, height), color='#ffffff')
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 32)
        font_header = ImageFont.truetype("arialbd.ttf", 24)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_bold = ImageFont.truetype("arialbd.ttf", 22)
        font_regular = ImageFont.truetype("arial.ttf", 20)
        font_mono = ImageFont.truetype("consola.ttf", 20)
        font_small = ImageFont.truetype("arial.ttf", 16)
    except:
        font_title = font_header = font_sub = font_bold = font_regular = font_mono = font_small = ImageFont.load_default()

    # Outer border
    draw.rectangle([(25, 25), (width - 25, height - 25)], outline='#0f172a', width=3)
    draw.rectangle([(35, 35), (width - 35, height - 35)], outline='#94a3b8', width=1)

    # Header
    draw.text((width // 2, 70), "GOVERNMENT OF INDIA - MINISTRY OF PANCHAYATI RAJ", fill='#0f172a', font=font_title, anchor="mm")
    draw.text((width // 2, 110), "SVAMITVA PROPERTY CARD & RECORD OF RIGHTS (RoR)", fill='#b45309', font=font_header, anchor="mm")
    draw.text((width // 2, 145), "Form-1: Land Title & Ownership Certificate", fill='#475569', font=font_sub, anchor="mm")
    
    draw.line([(45, 175), (width - 45, 175)], fill='#cbd5e1', width=2)
    
    # Metadata strip
    draw.text((60, 195), "Property UID: SVAMITVA-KA-BLR-0042", fill='#0f172a', font=font_bold)
    draw.text((60, 230), "Issuing Authority: Directorate of Land Records", fill='#475569', font=font_regular)
    draw.text((width - 60, 195), "Survey Date: 14-Aug-2024", fill='#475569', font=font_regular, anchor="ra")
    draw.text((width - 60, 230), "Drone Batch: SV-2024-DRN-09", fill='#475569', font=font_regular, anchor="ra")

    # Section 1: Administrative Location
    y = 280
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "1. ADMINISTRATIVE & JURISDICTIONAL DETAILS", fill='#0f172a', font=font_bold, anchor="lm")
    
    y += 50
    fields_admin = [
        ("State", "Karnataka"),
        ("District", "Bengaluru Urban"),
        ("Tehsil", "Bengaluru East"),
        ("Village", "Kadugodi"),
    ]
    for i, (k, v) in enumerate(fields_admin):
        col = i % 2
        row = i // 2
        cur_x = 70 if col == 0 else 640
        cur_y = y + (row * 42)
        draw.text((cur_x, cur_y), f"{k} :", fill='#475569', font=font_regular)
        draw.text((cur_x + 140, cur_y), f"{v}", fill='#0f172a', font=font_bold)

    # Section 2: Parcel & Ownership Details
    y = 440
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "2. PARCEL & OWNERSHIP SPECIFICATIONS", fill='#0f172a', font=font_bold, anchor="lm")
    
    y += 50
    fields_prop = [
        ("Owner Name", "Ramesh Kumar Sharma"),
        ("Co-Owner", "Meera Ramesh Sharma"),
        ("Khasra Number", "42/1-A"),
        ("Survey Number", "104/2B"),
        ("Khata Number", "KH-8820"),
        ("Classification", "Residential"),
        ("Area", "420.50 sqm"),
        ("Floors", "3 Floors (G+2)"),
    ]
    for i, (k, v) in enumerate(fields_prop):
        col = i % 2
        row = i // 2
        cur_x = 70 if col == 0 else 640
        cur_y = y + (row * 46)
        draw.text((cur_x, cur_y), f"{k} :", fill='#475569', font=font_regular)
        draw.text((cur_x + 200, cur_y), f"{v}", fill='#0f172a', font=font_bold)

    # Section 3: Boundary Geo-Coordinates
    y = 690
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "3. SPATIAL CADASTRE & GEO-COORDINATES", fill='#0f172a', font=font_bold, anchor="lm")
    
    y += 48
    coords = [
        ("Corner N1", "12.998412", "77.761245", "North Road (9m width)"),
        ("Corner E2", "12.998390", "77.761580", "East Boundary (Plot 43)"),
        ("Corner S3", "12.998120", "77.761550", "South Boundary (Plot 41)"),
        ("Corner W4", "12.998150", "77.761210", "West Boundary (Passage)"),
    ]
    
    # Table header
    draw.rectangle([(50, y), (width - 50, y + 34)], fill='#f1f5f9', outline='#cbd5e1')
    draw.text((70, y + 17), "Node ID", fill='#334155', font=font_bold, anchor="lm")
    draw.text((280, y + 17), "Latitude", fill='#334155', font=font_bold, anchor="lm")
    draw.text((490, y + 17), "Longitude", fill='#334155', font=font_bold, anchor="lm")
    draw.text((720, y + 17), "Abutting Feature", fill='#334155', font=font_bold, anchor="lm")
    
    y += 34
    for node, lat, lng, abut in coords:
        draw.rectangle([(50, y), (width - 50, y + 34)], fill='#ffffff', outline='#e2e8f0')
        draw.text((70, y + 17), node, fill='#0f172a', font=font_mono, anchor="lm")
        draw.text((280, y + 17), lat, fill='#0f172a', font=font_mono, anchor="lm")
        draw.text((490, y + 17), lng, fill='#0f172a', font=font_mono, anchor="lm")
        draw.text((720, y + 17), abut, fill='#475569', font=font_regular, anchor="lm")
        y += 34

    # Verification Note
    y = 920
    draw.rectangle([(50, y), (width - 50, y + 110)], fill='#f8fafc', outline='#e2e8f0', width=1)
    draw.text((70, y + 22), "CERTIFICATION & ENUMERATION STATEMENT:", fill='#0f172a', font=font_bold)
    note_lines = [
        "This digitized Record of Rights (RoR) is certified under the SVAMITVA Scheme framework.",
        "The spatial extents are mapped using High-Resolution Orthomosaic Drone Imagery (GSD < 5cm).",
        "The titleholder is authorized for spatial property transaction, tax assessment, and 3D elevation sanction."
    ]
    for i, line in enumerate(note_lines):
        draw.text((70, y + 50 + (i * 24)), line, fill='#475569', font=font_regular)

    # Seal & Signature
    y = 1080
    draw.rectangle([(60, y), (340, y + 130)], fill='#ffffff', outline='#cbd5e1')
    draw.text((200, y + 25), "[ OFFICIAL QR CODE ]", fill='#94a3b8', font=font_regular, anchor="mm")
    draw.text((200, y + 65), "DIGITALLY VERIFIED", fill='#16a34a', font=font_bold, anchor="mm")
    draw.text((200, y + 95), "UID: KA-BLR-0042-8820", fill='#64748b', font=font_mono, anchor="mm")

    draw.rectangle([(width - 380, y), (width - 60, y + 130)], fill='#ffffff', outline='#cbd5e1')
    draw.text((width - 220, y + 25), "Tahsildar / Revenue Officer", fill='#0f172a', font=font_bold, anchor="mm")
    draw.text((width - 220, y + 55), "Bengaluru East Taluk", fill='#475569', font=font_regular, anchor="mm")
    draw.text((width - 220, y + 95), "Digital Signature: VERIFIED", fill='#0284c7', font=font_mono, anchor="mm")

    # Footer
    draw.line([(50, 1500), (width - 50, 1500)], fill='#cbd5e1', width=1)
    draw.text((width // 2, 1530), "Page 1 of 1 • System Generated Land Title Certificate • SVAMITVA National Portal", fill='#94a3b8', font=font_small, anchor="mm")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG", quality=95)
    print(f"Crisp deed saved at {output_path}")

if __name__ == "__main__":
    create_crisp_deed("public/sample-svamitva-property-card.png")
    create_crisp_deed("src/data/sample-svamitva-property-card.png")
