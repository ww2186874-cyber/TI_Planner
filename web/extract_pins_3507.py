import json
import re
import sys
from datetime import date
from pathlib import Path

import pdfplumber


PACKAGE_COLUMNS = {
    "PM": {"column": 4, "signalColumn": 2, "pins": 64, "label": "PM-64 LQFP"},
    "PT": {"column": 5, "signalColumn": 3, "pins": 48, "label": "PT-48 LQFP"},
    "RGZ": {"column": 5, "signalColumn": 3, "pins": 48, "label": "RGZ-48 VQFN"},
    "RHB": {"column": 6, "signalColumn": 4, "pins": 32, "label": "RHB-32 VQFN"},
}


def clean(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def category_for(signal):
    if signal.startswith(("UART", "BSL")):
        return "UART"
    if signal.startswith("I2C"):
        return "I2C"
    if signal.startswith("SPI"):
        return "SPI"
    if signal.startswith("CAN"):
        return "CAN"
    if signal.startswith(("TIMA", "TIMG", "RTC_OUT", "CLK_OUT")):
        return "Timer / Clock"
    if signal.startswith(("A0_", "A1_", "ADC")):
        return "ADC"
    if signal.startswith("DAC"):
        return "DAC"
    if signal.startswith("COMP"):
        return "Comparator"
    if signal.startswith(("HFX", "LFX", "LFCLK", "HFCLK", "FCC", "ROSC")):
        return "Clock"
    if signal == "NRST":
        return "System"
    if re.fullmatch(r"P[AB]\d{1,2}", signal):
        return "GPIO"
    if signal in {"VDD", "VSS", "VCORE"}:
        return "Power"
    return "Other"


def normalize_type(value, signal):
    raw = clean(value).upper().replace("/", "")
    if signal in {"VDD", "VSS", "VCORE"}:
        return "PWR"
    return {"P": "PWR", "IO": "IO"}.get(raw, raw)


def package_numbers(value):
    return [int(item) for item in re.findall(r"\d+", value or "")]


def signal_metadata(document):
    metadata = {}
    for page in document.pages[14:23]:
        for table in page.extract_tables():
            if not table or len(table[0]) != 8:
                continue
            for row in table[2:]:
                signal = clean(row[1])
                if not signal:
                    continue
                metadata[signal] = {
                    "signalType": normalize_type(row[6], signal),
                    "description": clean(row[7]),
                    "packagePins": {
                        package: package_numbers(row[details["signalColumn"]])
                        for package, details in PACKAGE_COLUMNS.items()
                    },
                }
    return metadata


def add_function(functions, signal, pf, managed, metadata, pf_label=None):
    signal = clean(signal)
    if not signal or any(item["signal"] == signal and item["pf"] == pf for item in functions):
        return
    details = metadata.get(signal, {})
    functions.append(
        {
            "signal": signal,
            "category": category_for(signal),
            "pf": pf,
            "iomuxManaged": managed,
            "pfLabel": pf_label if pf_label is not None else str(pf),
            "signalType": details.get("signalType", ""),
        }
    )


def extract(pdf_path):
    with pdfplumber.open(pdf_path) as document:
        metadata = signal_metadata(document)
        logical_pins = []
        for page in document.pages[10:14]:
            for table in page.extract_tables():
                if not table or len(table[0]) != 9:
                    continue
                for row in table[2:]:
                    pincm = clean(row[0])
                    pin_name = clean(row[1])
                    analog = clean(row[2])
                    digital = clean(row[3])
                    if pincm == "N/A" and not pin_name:
                        pin_name = analog
                        analog = ""
                    if not pin_name:
                        continue

                    package_pins = {
                        package: package_numbers(row[details["column"]])
                        for package, details in PACKAGE_COLUMNS.items()
                    }
                    functions = []
                    if pin_name in {"VDD", "VSS", "VCORE", "NRST"}:
                        add_function(functions, pin_name, 0, False, metadata, "(Non-IOMUX 1) 0")
                    else:
                        add_function(functions, pin_name, 1, True, metadata)
                        for index, signal in enumerate(re.split(r"\s*/\s*", analog), start=1):
                            add_function(functions, signal, 0, False, metadata, f"(Non-IOMUX {index}) 0")
                        for signal, pf in re.findall(r"([A-Za-z][A-Za-z0-9_+\-]*)\s*\[\s*(\d+)\s*\]", digital):
                            add_function(functions, signal, int(pf), True, metadata)

                    logical_pins.append(
                        {
                            "name": pin_name,
                            "iomuxRegister": f"PINCM{pincm}" if pincm.isdigit() else "",
                            "iomuxAddress": f"0x{0x40428000 + (int(pincm) - 1) * 4:08x}" if pincm.isdigit() else "",
                            "bufferType": clean(row[8]),
                            "fixed": pin_name in {"VDD", "VSS", "VCORE"},
                            "packagePins": package_pins,
                            "functions": functions,
                        }
                    )

        # Bootloader signals are documented separately and are not IOMUX PF choices.
        for signal in ("BSL_invoke", "BSLSCL", "BSLSDA", "BSLRX", "BSLTX"):
            details = metadata.get(signal)
            if not details:
                continue
            for logical in logical_pins:
                if any(
                    set(logical["packagePins"].get(package, []))
                    & set(details["packagePins"].get(package, []))
                    for package in PACKAGE_COLUMNS
                ):
                    add_function(
                        logical["functions"], signal, 0, False, metadata,
                        f"(Non-IOMUX {1 + sum(not item['iomuxManaged'] for item in logical['functions'])}) 0",
                    )

    packages = {}
    for package, details in PACKAGE_COLUMNS.items():
        pins = []
        for logical in logical_pins:
            for number in logical["packagePins"].get(package, []):
                pins.append(
                    {
                        "number": number,
                        "name": logical["name"],
                        "iomuxRegister": logical["iomuxRegister"],
                        "iomuxAddress": logical["iomuxAddress"],
                        "bufferType": logical["bufferType"],
                        "fixed": logical["fixed"],
                        "functions": logical["functions"],
                    }
                )
        pins.sort(key=lambda pin: pin["number"])
        expected = details["pins"]
        numbers = {pin["number"] for pin in pins}
        missing = sorted(set(range(1, expected + 1)) - numbers)
        if len(pins) != expected or missing:
            raise ValueError(f"{package}: expected {expected} pins, found {len(pins)}, missing {missing}")
        packages[package] = {
            "code": package,
            "label": details["label"],
            "pinCount": expected,
            "pins": pins,
        }

    return {
        "device": "MSPM0G3507",
        "source": {
            "document": "MSPM0G350x Mixed-Signal Microcontrollers With CAN-FD Interface",
            "revision": "SLASEX6C, revised October 2025",
            "pages": "8-23",
            "url": "https://www.ti.com/lit/ds/symlink/mspm0g3507.pdf",
            "retrieved": date.today().isoformat(),
        },
        "packages": packages,
    }


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_pins_3507.py <datasheet.pdf> <output.json>")
    output_path = Path(sys.argv[2])
    data = extract(Path(sys.argv[1]))
    output_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({code: package["pinCount"] for code, package in data["packages"].items()}))


if __name__ == "__main__":
    main()
