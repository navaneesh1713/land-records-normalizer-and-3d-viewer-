import os
from PIL import Image, ImageDraw, ImageFont

def create_second_deed(output_path):
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

    draw.rectangle([(25, 25), (width - 25, height - 25)], outline='#0f172a', width=3)
    draw.rectangle([(35, 35), (width - 35, height - 35)], outline='#94a3b8', width=1)

    draw.text((width // 2, 70), "REVENUE DEPARTMENT - GOVERNMENT OF KARNATAKA", fill='#0f172a', font=font_title, anchor="mm")
    draw.text((width // 2, 110), "BHOOMI ONLINE LAND RECORDS - FORM 16 (RTC EXTRACT)", fill='#b45309', font=font_header, anchor="mm")
    draw.text((width // 2, 145), "Certificate of Land Title & Tenancy Rights", fill='#475569', font=font_sub, anchor="mm")
    
    draw.line([(45, 175), (width - 45, 175)], fill='#cbd5e1', width=2)
    
    draw.text((60, 195), "Khata Identifier: KA-BHOOMI-BLR-0098", fill='#0f172a', font=font_bold)
    draw.text((60, 230), "Sub-Registrar Office: K.R. Puram / Bengaluru East", fill='#475569', font=font_regular)
    draw.text((width - 60, 195), "Verification Date: 20-Aug-2024", fill='#475569', font=font_regular, anchor="ra")
    draw.text((width - 60, 230), "Mutation Order: MUT-2024-8842", fill='#475569', font=font_regular, anchor="ra")

    y = 280
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "1. REVENUE JURISDICTION", fill='#0f172a', font=font_bold, anchor="lm")
    
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

    y = 440
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "2. LAND PARCEL SPECIFICATIONS & TITLEHOLDER", fill='#0f172a', font=font_bold, anchor="lm")
    
    y += 50
    fields_prop = [
        ("Owner Name", "Suresh Venkatakrishnan"),
        ("Co-Owner", "Priya Venkatakrishnan"),
        ("Khasra Number", "88/4B"),
        ("Survey Number", "104/3"),
        ("Khata Number", "KH-9921"),
        ("Classification", "Commercial"),
        ("Area", "580.00 sqm"),
        ("Floors", "2 Floors (G+1)"),
    ]
    for i, (k, v) in enumerate(fields_prop):
        col = i % 2
        row = i // 2
        cur_x = 70 if col == 0 else 640
        cur_y = y + (row * 46)
        draw.text((cur_x, cur_y), f"{k} :", fill='#475569', font=font_regular)
        draw.text((cur_x + 200, cur_y), f"{v}", fill='#0f172a', font=font_bold)

    y = 690
    draw.rectangle([(50, y), (width - 50, y + 38)], fill='#f8fafc', outline='#94a3b8', width=1)
    draw.text((65, y + 19), "3. CADASTRE BOUNDARIES", fill='#0f172a', font=font_bold, anchor="lm")
    
    y += 48
    coords = [
        ("North Boundary", "Main Hoskote Highway (30m)", "Plot Extent 24.5m"),
        ("East Boundary", "Commercial Complex Plot #89", "Plot Extent 23.8m"),
        ("South Boundary", "Internal Service Road (6m)", "Plot Extent 24.2m"),
        ("West Boundary", "Pedestrian Walkway", "Plot Extent 23.9m"),
    ]
    
    draw.rectangle([(50, y), (width - 50, y + 34)], fill='#f1f5f9', outline='#cbd5e1')
    draw.text((70, y + 17), "Boundary Direction", fill='#334155', font=font_bold, anchor="lm")
    draw.text((380, y + 17), "Abutting Infrastructure", fill='#334155', font=font_bold, anchor="lm")
    draw.text((820, y + 17), "Linear Dimension", fill='#334155', font=font_bold, anchor="lm")
    
    y += 34
    for d, abut, dim in coords:
        draw.rectangle([(50, y), (width - 50, y + 34)], fill='#ffffff', outline='#e2e8f0')
        draw.text((70, y + 17), d, fill='#0f172a', font=font_bold, anchor="lm")
        draw.text((380, y + 17), abut, fill='#475569', font=font_regular, anchor="lm")
        draw.text((820, y + 17), dim, fill='#0f172a', font=font_mono, anchor="lm")
        y += 34

    y = 920
    draw.rectangle([(50, y), (width - 50, y + 110)], fill='#f8fafc', outline='#e2e8f0', width=1)
    draw.text((70, y + 22), "REVENUE RECORD STATEMENT:", fill='#0f172a', font=font_bold)
    note_lines = [
        "Certified that the entries above correspond to the computerized Bhoomi RTC Database.",
        "The property is free from encumbrance and authorized for spatial registration.",
        "Revenue assessment classification: Commercial Category-II."
    ]
    for i, line in enumerate(note_lines):
        draw.text((70, y + 50 + (i * 24)), line, fill='#475569', font=font_regular)

    y = 1080
    draw.rectangle([(60, y), (340, y + 130)], fill='#ffffff', outline='#cbd5e1')
    draw.text((200, y + 25), "[ DIGITAL BARCODE ]", fill='#94a3b8', font=font_regular, anchor="mm")
    draw.text((200, y + 65), "BHOOMI VERIFIED", fill='#16a34a', font=font_bold, anchor="mm")
    draw.text((200, y + 95), "RTC-KA-BLR-8842", fill='#64748b', font=font_mono, anchor="mm")

    draw.rectangle([(width - 380, y), (width - 60, y + 130)], fill='#ffffff', outline='#cbd5e1')
    draw.text((width - 220, y + 25), "Sheristedar / Revenue Inspector", fill='#0f172a', font=font_bold, anchor="mm")
    draw.text((width - 220, y + 55), "Kadugodi Revenue Circle", fill='#475569', font=font_regular)
    draw.text((width - 220, y + 95), "Bhoomi Digital Token: VALID", fill='#0284c7', font=font_mono, anchor="mm")

    draw.line([(50, 1500), (width - 50, 1500)], fill='#cbd5e1', width=1)
    draw.text((width // 2, 1530), "Page 1 of 1 • Bhoomi RTC Certificate • Karnataka Land Records Information System", fill='#94a3b8', font=font_small, anchor="mm")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG", quality=95)
    print(f"Second deed saved at {output_path}")

if __name__ == "__main__":
    create_second_deed("public/sample-bhoomi-deed.png")
