import json
import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"


class SiteQualityContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = HTML_PATH.read_text(encoding="utf-8")

    def test_structured_data_is_valid_schema_org_json(self):
        match = re.search(
            r'<script type="application/ld\+json">\s*(.*?)\s*</script>',
            self.source,
            re.DOTALL,
        )
        if match is None:
            self.fail("Missing JSON-LD block")
        payload = json.loads(match.group(1))
        self.assertEqual(payload["@context"], "https://schema.org")
        self.assertIsInstance(payload["@graph"], list)

    def test_editorial_photography_is_delivered_as_cacheable_assets(self):
        self.assertNotIn("data:image/jpeg;base64,", self.source)
        self.assertIn('src="/assets/photos/david-howard-hero.jpg"', self.source)
        self.assertIn(
            'alt="David Howard playing a golf shot"',
            self.source,
        )
        photos = ROOT / "assets" / "photos"
        self.assertTrue((photos / "david-howard-hero.jpg").is_file())
        self.assertGreater((photos / "david-howard-hero.jpg").stat().st_size, 10_000)

    def test_press_biographies_match_their_published_word_counts(self):
        for size in (50, 100, 300):
            match = re.search(
                rf'<p id="bio-{size}">(.*?)</p>',
                self.source,
                re.DOTALL,
            )
            if match is None:
                self.fail(f"Missing {size}-word biography")
            plain = re.sub(r"<[^>]+>", "", match.group(1))
            words = re.findall(r"\b[\w’'-]+\b", plain)
            self.assertEqual(len(words), size, f"bio-{size} has {len(words)} words")

    def test_section_headings_are_readable_without_animation_javascript(self):
        base_rule = re.search(
            r"\.headline-reveal \.headline-word-inner\s*\{([^}]*)\}",
            self.source,
            re.DOTALL,
        )
        if base_rule is None:
            self.fail("Missing section heading rule")
        declarations = base_rule.group(1)
        self.assertIn("opacity:1", declarations)
        self.assertNotIn("opacity:0", declarations)
        self.assertNotIn("will-change", declarations)

    def test_mobile_scorecard_fits_all_five_columns(self):
        self.assertIn(
            ".scorecard table{ min-width:0; table-layout:fixed; }",
            self.source,
        )
        self.assertIn(".scorecard{ overflow-x:visible; }", self.source)


if __name__ == "__main__":
    unittest.main()
