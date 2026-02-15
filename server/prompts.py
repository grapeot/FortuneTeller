"""
Prompt builder (Jinja template based).

System prompt is split into reusable parts:
1) evidence contract
2) face reading guideline (knowledge injection)
3) task-specific template
"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader


TEMPLATE_DIR = Path(__file__).parent / "prompt_templates"


def _read_text(relative_path: str) -> str:
    return (TEMPLATE_DIR / relative_path).read_text(encoding="utf-8").strip()


def _build_prompt(template_name: str) -> str:
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template(template_name)
    return template.render(
        evidence_contract=_read_text("parts/evidence_contract.txt"),
        face_reading_guideline=_read_text("parts/face_reading_guideline.txt"),
    ).strip()


SYSTEM_PROMPT = _build_prompt("system_prompt.j2")
DEEP_ANALYSIS_PROMPT = _build_prompt("deep_analysis_prompt.j2")
