import io
import os
import unittest
from contextlib import redirect_stderr

from scripts import import_data


class ResolveDatabaseUrlTests(unittest.TestCase):
    def test_uses_database_url_from_environment(self):
        original = os.environ.get("DATABASE_URL")
        try:
            os.environ["DATABASE_URL"] = "******localhost:5432/example"
            self.assertEqual(
                import_data.resolve_database_url(),
                "******localhost:5432/example",
            )
        finally:
            if original is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = original

    def test_falls_back_with_guidance_when_database_url_missing(self):
        original = os.environ.pop("DATABASE_URL", None)
        try:
            stderr = io.StringIO()
            with redirect_stderr(stderr):
                resolved = import_data.resolve_database_url()
            self.assertEqual(resolved, "postgresql+psycopg://localhost:5432/finshield")
            self.assertIn("DATABASE_URL is not set", stderr.getvalue())
        finally:
            if original is not None:
                os.environ["DATABASE_URL"] = original


if __name__ == "__main__":
    unittest.main()
