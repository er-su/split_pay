import json
import requests
from datetime import datetime, timezone

""" resp = requests.get("https://open.er-api.com/v6/latest/USD")
now = datetime.now(timezone.utc).timestamp()
print(resp.json())
print(type(resp.json())) """

with open("path.json", "r") as f:
    data = json.load(f)

print((1.0 / float(data["rates"]["EUR"])))