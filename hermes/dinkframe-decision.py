import argparse
import json
from pathlib import Path
import sys
from urllib import error, request


PROJECT_DIR = Path(r"C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply one DINKFRAME Telegram approval.")
    parser.add_argument("job_id")
    parser.add_argument("approval_token")
    parser.add_argument("decision", choices=("approve", "revise", "cancel"))
    parser.add_argument("feedback", nargs="*")
    args = parser.parse_args()

    env = load_env(PROJECT_DIR / ".env.local")
    token = env.get("DINKFRAME_AUTOMATION_RUNNER_TOKEN", "")
    app_url = env.get("DINKFRAME_AUTOMATION_APP_URL", "http://localhost:3000").rstrip("/")
    if len(token) < 32:
        print("DINKFRAME automation token is not configured.", file=sys.stderr)
        return 1

    payload = {
        "approvalToken": args.approval_token,
        "decision": args.decision,
    }
    feedback = " ".join(args.feedback).strip()
    if feedback:
        payload["feedback"] = feedback

    body = json.dumps(payload).encode("utf-8")
    target = f"{app_url}/api/automation/jobs/{args.job_id}/decision"
    call = request.Request(
        target,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with request.urlopen(call, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        result = json.loads(exc.read().decode("utf-8"))
        print(result.get("error", "The DINKFRAME decision was rejected."), file=sys.stderr)
        return 1
    except Exception:
        print("DINKFRAME could not reach the approval service.", file=sys.stderr)
        return 1

    print(result.get("message", "DINKFRAME decision applied."))
    return 0


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


if __name__ == "__main__":
    sys.exit(main())
