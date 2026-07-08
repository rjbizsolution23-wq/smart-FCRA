import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\ricky\Downloads\fcra-detector-main\fcra-detector-main\src\engine\parser.ts", "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "lastPayment" in line or "last_payment" in line or "Date of Last Payment" in line or "Last Payment Amount" in line:
            print(f"{line_num}: {line.strip()}")
