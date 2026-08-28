from pathlib import Path
import shutil
import subprocess
import sys


PROJECT_DIR = Path(r"C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0")
IDLE_MESSAGE = "No DINKFRAME generation jobs are queued."


def main() -> int:
    npm = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
    browser_result = run_npm(npm, "automation:browser")
    if browser_result.returncode != 0:
        print_output(browser_result)
        return browser_result.returncode

    result = run_npm(npm, "automation:run")
    output = combined_output(result)

    if result.returncode != 0:
        if output:
            print(output)
        return result.returncode
    if IDLE_MESSAGE not in output and output:
        print(output)
    return 0


def run_npm(npm: str, script: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [npm, "run", "--silent", script],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return result


def combined_output(result: subprocess.CompletedProcess[str]) -> str:
    output = "\n".join(
        part.strip() for part in (result.stdout, result.stderr) if part.strip()
    )
    return output


def print_output(result: subprocess.CompletedProcess[str]) -> None:
    output = combined_output(result)
    if output:
        print(output)


if __name__ == "__main__":
    sys.exit(main())
