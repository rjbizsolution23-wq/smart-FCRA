import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r"c:\Users\ricky\Downloads\fcra-detector-main\fcra-detector-main\src\engine\parser.ts", "r", encoding="utf-8") as f:
    in_function = False
    lines = []
    for line_num, line in enumerate(f, 1):
        if "function parse" in line:
            print(f"--- Line {line_num}: {line.strip()}")
