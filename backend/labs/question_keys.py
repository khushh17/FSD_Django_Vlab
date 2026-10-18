"""
Answer keys for marking quiz attempts on the server, so a score cannot be made up in the
browser. question_keys.json is generated from the experiments' question banks by
`npm run export:keys`; a test fails if it is out of date.
"""

import json
from functools import cache
from pathlib import Path

KEYS_FILE = Path(__file__).with_name("question_keys.json")


@cache
def _all_keys():
    return json.loads(KEYS_FILE.read_text(encoding="utf-8"))


def keys_for(experiment):
    """{"posttestLevels": [...], "questions": {id: {kind, levels, answer, options}}}, or None."""
    return _all_keys().get(experiment)
