import json
import re
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
MIGRATION_HTML_PATH = ROOT / "port" / "davidhowardgolf-v15-lean.html"


class SiteQualityContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = HTML_PATH.read_text(encoding="utf-8")
        cls.migration_source = MIGRATION_HTML_PATH.read_text(encoding="utf-8")

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

    def test_press_biographies_are_present_at_useful_lengths(self):
        ranges = {50: (45, 75), 100: (80, 150), 300: (250, 400)}
        for size, (minimum, maximum) in ranges.items():
            match = re.search(
                rf'<p id="bio-{size}">(.*?)</p>',
                self.source,
                re.DOTALL,
            )
            if match is None:
                self.fail(f"Missing bio-{size}")
            plain = re.sub(r"<[^>]+>", "", match.group(1))
            words = re.findall(r"\b[\w’'-]+\b", plain)
            self.assertGreaterEqual(len(words), minimum, f"bio-{size} is too short")
            self.assertLessEqual(len(words), maximum, f"bio-{size} is too long")

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

    def test_completed_south_of_ireland_result_replaces_live_language(self):
        maintained_copy = self.source + self.migration_source
        self.assertNotIn("Playing now", maintained_copy)
        self.assertNotIn('aria-label="Currently playing"', maintained_copy)
        self.assertNotIn("about to play in the oldest championship", maintained_copy)
        self.assertNotIn("Bios at 50, 100 and 300 words", maintained_copy)
        self.assertIn("South of Ireland semi-finalist", self.source)
        self.assertIn("South of Ireland semi-finalist", self.migration_source)
        self.assertIn("Tomi Bowen", self.source)
        self.assertIn("2&amp;1", self.source)
        self.assertIn(
            "https://www.irishexaminer.com/sport/golf/arid-41886286.html",
            self.source,
        )

    def test_mobile_scorecard_fits_all_five_columns(self):
        self.assertIn(
            ".scorecard table{ min-width:0; table-layout:fixed; }",
            self.source,
        )
        self.assertIn(".scorecard{ overflow-x:visible; }", self.source)


if __name__ == "__main__":
    unittest.main()
