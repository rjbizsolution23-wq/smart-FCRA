import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\ricky\Downloads\fcra-detector-main\fcra-detector-main\src\index.tsx", "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "DOCUMENT_TYPES" in line:
            print(f"{line_num}: {line.strip()}")
