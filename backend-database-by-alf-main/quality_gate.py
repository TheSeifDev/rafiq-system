from __future__ import annotations

import subprocess  # nosec B404
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class GateStep:
    name: str
    command: list[str]


def run_step(step: GateStep) -> None:
    print(f"\n=== {step.name} ===")
    print(" ".join(step.command))
    result = subprocess.run(step.command, check=False)  # nosec B603
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main() -> None:
    python = sys.executable
    steps = [
        GateStep("Unit tests", [python, "-m", "unittest", "discover", "-v"]),
        GateStep("Ruff lint", [python, "-m", "ruff", "check", "."]),
        GateStep(
            "Mypy type check",
            [
                python,
                "-m",
                "mypy",
                "api.py",
                "db.py",
                "seed.py",
                "settings.py",
                "sync.py",
                "test_all.py",
                "test_db_constraints.py",
            ],
        ),
        GateStep("Bandit security scan", [python, "-m", "bandit", "-q", "-r", ".", "-c", "pyproject.toml"]),
        GateStep("Dependency vulnerability scan", [python, "-m", "pip_audit", "-r", "requirements.txt"]),
    ]

    for step in steps:
        run_step(step)

    print("\nQuality gate passed.")


if __name__ == "__main__":
    main()
