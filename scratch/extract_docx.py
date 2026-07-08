import zipfile
import xml.etree.ElementTree as ET
import os
import sys

# Reconfigure stdout to use utf-8 to avoid Windows encoding errors
sys.stdout.reconfigure(encoding='utf-8')

def get_docx_text(path):
    try:
        doc = zipfile.ZipFile(path)
        xml_content = doc.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        # Word XML namespaces
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        }
        
        paragraphs = []
        for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append("".join(texts))
        return "\n".join(paragraphs)
    except Exception as e:
        return f"Error reading {path}: {str(e)}"

round1_path = r"C:\Users\ricky\Downloads\gary\Rick\round 1 letter\Round 1 Sue to Delete 1681i.docx"

print("--- ROUND 1 LETTER ---")
print(get_docx_text(round1_path))
