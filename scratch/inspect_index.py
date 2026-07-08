import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\ricky\Downloads\fcra-detector-main\fcra-detector-main\src\index.tsx", "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "1681i" in line or "1681I" in line or "generate" in line or "violations" in line:
            # print only matching lines with less than 200 characters to keep output readable
            if len(line.strip()) < 150:
                print(f"{line_num}: {line.strip()}")
