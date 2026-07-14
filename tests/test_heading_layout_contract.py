import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "index.html").read_text()


class HeadingLayoutContractTests(unittest.TestCase):
    def test_section_headline_animation_uses_collision_resistant_component_classes(self):
        self.assertIn("headline-word", SOURCE)
        self.assertIn("headline-word-inner", SOURCE)
        self.assertNotIn("wrap.className = 'w'", SOURCE)
        self.assertNotIn("inner.className = 'wi'", SOURCE)

    def test_section_headlines_have_safe_wrapping_and_vertical_breathing_room(self):
        self.assertIn("h2.display{ font-size:var(--text-h2); max-width:min(100%, 12ch);", SOURCE)
        self.assertIn(".headline-word{", SOURCE)
        self.assertIn("overflow:visible;", SOURCE)
        self.assertIn("padding-block:0.08em 0.14em;", SOURCE)


if __name__ == "__main__":
    unittest.main()
