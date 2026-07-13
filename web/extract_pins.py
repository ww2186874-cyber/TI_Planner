import json
import re
import sys
from pathlib import Path

import pdfplumber


PACKAGE_COLUMNS = {
    "PT": {"column": 4, "pins": 48, "label": "PT-48 LQFP"},
    "PM": {"column": 5, "pins": 64, "label": "PM-64 LQFP"},
    "PN": {"column": 6, "pins": 80, "label": "PN-80 LQFP"},
    "PZ": {"column": 7, "pins": 100, "label": "PZ-100 LQFP"},
}


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def parse_pin_numbers(value):
    return [int(item) for item in re.findall(r"\d+", value or "")]


def parse_pin_identity(value):
    lines = [line.strip() for line in (value or "").splitlines() if line.strip()]
    return {
        "name": lines[0] if lines else "",
        "iomuxRegister": lines[1] if len(lines) > 1 else "",
        "iomuxAddress": lines[2] if len(lines) > 2 else "",
    }


def parse_pf(value):
    raw = clean(value)
    match = re.search(r"(\d+)\s*$", raw)
    return {
        "value": int(match.group(1)) if match else None,
        "managed": "Non-IOMUX" not in raw,
        "raw": raw,
    }


def category_for(signal):
    if signal.startswith("UART") or signal.startswith("BSL"):
        return "UART"
    if signal.startswith("I2C"):
        return "I2C"
    if signal.startswith("SPI"):
        return "SPI"
    if signal.startswith("CAN"):
        return "CAN"
    if signal.startswith(("TIMA", "TIMG", "TIMG", "TIMG", "RTC_OUT", "CLK_OUT")):
        return "Timer / Clock"
    if signal.startswith(("A0_", "A1_", "ADC")):
        return "ADC"
    if signal.startswith("DAC"):
        return "DAC"
    if signal.startswith("COMP"):
        return "Comparator"
    if signal.startswith(("HFX", "LFX", "LFCLK", "HFCLK", "FCC", "ROSC")):
        return "Clock"
    if signal in {"NRST", "WAKE"}:
        return "System"
    if re.fullmatch(r"P[ABC]\d{1,2}", signal):
        return "GPIO"
    if signal in {"VDD", "VSS", "VCORE"}:
        return "Power"
    return "Other"


def extract(pdf_path):
    logical_pins = {}

    with pdfplumber.open(pdf_path) as document:
        for page in document.pages[17:37]:
            for table in page.extract_tables():
                if not table or len(table[0]) != 13:
                    continue
                if "PIN NAME" not in (table[0][8] or ""):
                    continue

                current_name = None
                for row in table[1:]:
                    if row[8]:
                        identity = parse_pin_identity(row[8])
                        current_name = identity["name"]
                        record = logical_pins.setdefault(
                            current_name,
                            {
                                **identity,
                                "bufferType": clean(row[12]),
                                "packagePins": {},
                                "functions": [],
                            },
                        )
                        if not record["bufferType"] and row[12]:
                            record["bufferType"] = clean(row[12])
                        for package, metadata in PACKAGE_COLUMNS.items():
                            numbers = parse_pin_numbers(row[metadata["column"]])
                            if numbers:
                                record["packagePins"][package] = numbers

                    if not current_name or not row[9]:
                        continue

                    signal = clean(row[9])
                    pf = parse_pf(row[10])
                    function = {
                        "signal": signal,
                        "category": category_for(signal),
                        "pf": pf["value"],
                        "iomuxManaged": pf["managed"],
                        "pfLabel": pf["raw"],
                        "signalType": clean(row[11]),
                    }
                    existing = logical_pins[current_name]["functions"]
                    if not any(
                        item["signal"] == function["signal"]
                        and item["pfLabel"] == function["pfLabel"]
                        for item in existing
                    ):
                        existing.append(function)

    packages = {}
    for package, metadata in PACKAGE_COLUMNS.items():
        physical_pins = []
        for logical in logical_pins.values():
            for pin_number in logical["packagePins"].get(package, []):
                physical_pins.append(
                    {
                        "number": pin_number,
                        "name": logical["name"],
                        "iomuxRegister": logical["iomuxRegister"],
                        "iomuxAddress": logical["iomuxAddress"],
                        "bufferType": logical["bufferType"],
                        "fixed": logical["name"] in {"VDD", "VSS", "VCORE"},
                        "functions": logical["functions"],
                    }
                )
        physical_pins.sort(key=lambda pin: pin["number"])
        expected = metadata["pins"]
        actual_numbers = {pin["number"] for pin in physical_pins}
        missing = sorted(set(range(1, expected + 1)) - actual_numbers)
        if len(physical_pins) != expected or missing:
            raise ValueError(
                f"{package}: expected {expected} physical pins, "
                f"found {len(physical_pins)}, missing {missing}"
            )
        packages[package] = {
            "code": package,
            "label": metadata["label"],
            "pinCount": expected,
            "pins": physical_pins,
        }

    return {
        "device": "MSPM0G3519",
        "source": {
            "document": "MSPM0Gx51x Mixed-Signal Microcontrollers With CAN-FD Interface",
            "revision": "SLASFA2B, revised October 2025",
            "pages": "10-37",
        },
        "packages": packages,
    }


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_pins.py <datasheet.pdf> <output.json>")
    pdf_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    data = extract(pdf_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {
        package: {
            "pins": item["pinCount"],
            "configurable": sum(not pin["fixed"] for pin in item["pins"]),
        }
        for package, item in data["packages"].items()
    }
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
