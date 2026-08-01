"""One-shot surgery: replace _normalize_text with an all-ASCII version.

The existing body contains literal invisible codepoints, which cannot be
reviewed or edited reliably. This rewrites the region between the two known
markers with source that spells every control character as \\uXXXX.
Deleted after it runs.
"""

import ast
import io

PATH = "api.py"
START = "def _normalize_text(value):"
END = "def _match_key(value):"

NEW = '''def _normalize_text(value):
\t"""Normalize a spreadsheet cell to comparable, storable text.

\tArabic sheets exported from Excel routinely carry characters that are
\tinvisible but not equal to a space: NBSP, narrow NBSP, and the bidi marks
\tExcel inserts around mixed Arabic/Latin runs. Two rows that look identical
\tthen produce two different keys, so the same item is created twice; the second
\tinsert collides on Item.name and the row vanishes from the import.

\tEvery control is written as an escape rather than as a literal character so
\tthis function stays readable and reviewable in the source file.

\tNFC composition is applied because Arabic letters with diacritics have both a
\tprecomposed and a decomposed encoding, and MariaDB compares the byte forms.
\tNFC is the composing form, so the text is never rewritten into a different
\tscript nor stripped of its diacritics: Arabic is preserved exactly, only its
\tencoding is made canonical.
\t"""
\tif value is None:
\t\treturn ""

\ttext = value if isinstance(value, str) else str(value)

\t# Zero-width and bidi controls carry no meaning for identity comparison, and
\t# Excel adds them unpredictably. Python does not treat them as whitespace, so
\t# they would survive split() and keep two identical names unequal.
\tfor invisible in _INVISIBLE_CHARS:
\t\ttext = text.replace(invisible, "")

\ttext = unicodedata.normalize("NFC", text)

\t# split() with no argument splits on every Unicode space -- NBSP (U+00A0),
\t# narrow NBSP (U+202F), U+2000-U+200A, ideographic space (U+3000), tabs and
\t# newlines from multi-line cells -- so the join both folds runs and trims.
\treturn " ".join(text.split())


'''

CONSTS = '''# Invisible characters Excel and Windows keyboards leave inside Arabic cells.
# Spelled as escapes on purpose: as literals they are unreviewable in a diff.
_INVISIBLE_CHARS = (
\t"\\u200b",  # zero width space
\t"\\u200c",  # zero width non-joiner
\t"\\u200d",  # zero width joiner
\t"\\u200e",  # left-to-right mark
\t"\\u200f",  # right-to-left mark
\t"\\u061c",  # arabic letter mark
\t"\\u202a",  # left-to-right embedding
\t"\\u202b",  # right-to-left embedding
\t"\\u202c",  # pop directional formatting
\t"\\u202d",  # left-to-right override
\t"\\u202e",  # right-to-left override
\t"\\u2066",  # left-to-right isolate
\t"\\u2067",  # right-to-left isolate
\t"\\u2068",  # first strong isolate
\t"\\u2069",  # pop directional isolate
\t"\\ufeff",  # byte order mark / zero width no-break space
\t"\\u00ad",  # soft hyphen
)


'''

src = io.open(PATH, encoding="utf-8").read()

i = src.index(START)
j = src.index(END)
src = src[:i] + CONSTS + NEW + src[j:]

if "import unicodedata\n" not in src.split("def ")[0]:
	# Put the stdlib import with the other top-level imports rather than inside
	# the function, matching how the rest of the module imports.
	marker = "import frappe\n"
	k = src.index(marker)
	src = src[:k] + "import unicodedata\n" + src[k:]

ast.parse(src)
io.open(PATH, "w", encoding="utf-8", newline="\n").write(src)
print("ok")
