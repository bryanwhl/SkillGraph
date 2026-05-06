#!/usr/bin/env python3
"""Local Qwen3 embedding helper for SkillGraph.

Input:  JSON on stdin: {"texts": ["..."]}
Output: JSON on stdout: {"vectors": [[...]]}

This script intentionally keeps Python dependencies optional for the npm package.
Install them only when enabling local semantic search:

  python -m pip install "sentence-transformers>=3.0.0"
"""

from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="Qwen/Qwen3-Embedding-0.6B")
    args = parser.parse_args()

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        sys.stderr.write(
            "Missing optional dependency: sentence-transformers. "
            'Install with: python -m pip install "sentence-transformers>=3.0.0"\n'
        )
        return 2

    payload = json.load(sys.stdin)
    texts = payload.get("texts")
    if not isinstance(texts, list) or not all(isinstance(item, str) for item in texts):
        sys.stderr.write('Expected stdin JSON shape: {"texts": ["..."]}\n')
        return 2

    model = SentenceTransformer(args.model, trust_remote_code=True)
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    json.dump({"vectors": vectors.tolist()}, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
