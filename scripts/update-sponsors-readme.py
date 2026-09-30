#!/usr/bin/env python3
"""Regenerate the sponsor section of README.md and README.zh.md.

    python3 scripts/update-sponsors-readme.py

The list lives in web/public/sponsors.json (nicknames, added with consent).
The website builds from it and the app's About dialog fetches it from
solomd.app, so after editing the JSON the only other step is this script.
"""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
names = [s["name"] for s in json.loads((root / "web/public/sponsors.json").read_text())["sponsors"]]

TEXT = {
    "README.md": ("## Sponsors",
                  "Thank you to everyone who sponsors SoloMD: ",
                  "No sponsors listed yet. Be the first: [solomd.app/#sponsor](https://solomd.app/#sponsor)."),
    "README.zh.md": ("## 赞助者",
                     "感谢这些朋友对 SoloMD 的赞助：",
                     "还没有赞助者。欢迎成为第一位：[solomd.app/#sponsor](https://solomd.app/#sponsor)。"),
}
START, END = "<!-- sponsors:start -->", "<!-- sponsors:end -->"

for fname, (heading, lead, empty) in TEXT.items():
    p = root / fname
    src = p.read_text()
    body = (lead + " · ".join(f"**{n}**" for n in names)) if names else empty
    block = f"{START}\n{heading}\n\n{body}\n{END}"
    if START in src:
        a, b = src.index(START), src.index(END) + len(END)
        src = src[:a] + block + src[b:]
    else:
        # First run: place the section just before the licence line.
        anchor = "\n## License" if "\n## License" in src else "\n## 许可证"
        if anchor not in src:
            raise SystemExit(f"{fname}: no licence heading to anchor the sponsor section")
        i = src.index(anchor)
        src = src[:i] + "\n" + block + "\n" + src[i:]
    p.write_text(src)
    print(f"{fname}: {len(names)} sponsor(s)")
