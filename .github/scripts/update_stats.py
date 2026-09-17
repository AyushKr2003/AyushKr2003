#!/usr/bin/env python3
"""
Pulls live GitHub stats for a user via the REST API and rewrites the
`gh stats --summary` block in README.md between the STATS-START /
STATS-END markers. No third-party rendering service involved, so there
is nothing that can go down except GitHub's own API.

Usage: GITHUB_TOKEN=... python3 update_stats.py <username> <readme-path>
"""

import datetime
import os
import re
import sys
import urllib.request
import json


def api_get(url, token):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "update-stats-script",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def fetch_stats(username, token):
    user = api_get(f"https://api.github.com/users/{username}", token)

    repos = []
    page = 1
    while True:
        batch = api_get(
            f"https://api.github.com/users/{username}/repos?per_page=100&page={page}",
            token,
        )
        if not batch:
            break
        repos.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    total_stars = sum(r["stargazers_count"] for r in repos)
    total_forks = sum(r["forks_count"] for r in repos)
    top_repo = max(repos, key=lambda r: r["stargazers_count"], default=None)

    return {
        "public_repos": user["public_repos"],
        "followers": user["followers"],
        "total_stars": total_stars,
        "total_forks": total_forks,
        "top_repo_name": top_repo["name"] if top_repo else None,
        "top_repo_stars": top_repo["stargazers_count"] if top_repo else 0,
    }


def render_block(stats):
    top_note = ""
    if stats["top_repo_name"] and stats["top_repo_stars"] > 0:
        top_note = f"★ {stats['top_repo_name']} leads ({stats['top_repo_stars']})"

    # Fixed inner content width; every line is built to exactly this width
    # so the box borders always line up regardless of how long the numbers
    # or repo name are (truncate rather than overflow the box).
    inner_width = 64

    def content_line(text):
        text = text[:inner_width]
        return f"│{text.ljust(inner_width)}│"

    total_width = inner_width + 2
    prefix = "┌─ gh stats --summary "
    top_border = prefix + "─" * (total_width - len(prefix) - 1) + "┐"
    bottom_border = "└" + "─" * inner_width + "┘"

    lines = [
        top_border,
        content_line(""),
        content_line(f"   Public Repos   : {stats['public_repos']}"),
        content_line(f"   Total Stars    : {stats['total_stars']}   {top_note}"),
        content_line(f"   Total Forks    : {stats['total_forks']}"),
        content_line(f"   Followers      : {stats['followers']}"),
        content_line(""),
        bottom_border,
    ]

    today = datetime.date.today().isoformat()
    body = "\n".join(lines)
    return (
        "<!-- STATS-START -->\n"
        "```\n"
        f"{body}\n"
        "```\n"
        f"<sub>Auto-updated daily by <code>.github/workflows/update-stats.yml</code> "
        f"· last refreshed: {today}</sub>\n"
        "<!-- STATS-END -->"
    )


def main():
    if len(sys.argv) != 3:
        print("Usage: update_stats.py <username> <readme-path>", file=sys.stderr)
        sys.exit(1)

    username, readme_path = sys.argv[1], sys.argv[2]
    token = os.environ.get("GITHUB_TOKEN", "")

    stats = fetch_stats(username, token)
    new_block = render_block(stats)

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(
        r"<!-- STATS-START -->.*?<!-- STATS-END -->", re.DOTALL
    )
    if not pattern.search(content):
        print("STATS-START/STATS-END markers not found in README", file=sys.stderr)
        sys.exit(1)

    updated = pattern.sub(new_block.replace("\\", "\\\\"), content, count=1)

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(updated)

    print("Stats block updated:")
    print(new_block)


if __name__ == "__main__":
    main()
