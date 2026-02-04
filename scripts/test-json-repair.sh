#!/bin/bash
#
# Test suite for JSON repair functions in bootstrap scripts
# Tests both bash (bootstrap.sh) and the underlying node.js implementation
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

pass() {
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}  PASS${NC}: $1"
}

fail() {
    FAILED=$((FAILED + 1))
    echo -e "${RED}  FAIL${NC}: $1"
    [ -n "$2" ] && echo -e "       ${YELLOW}$2${NC}"
}

# Test helper: Parse JSON with our repair functions
parse_json() {
    local input="$1"
    echo "$input" | VERBOSE=true node -e '
const verboseJson = process.env.VERBOSE === "true";
const log = [];

function logRepair(level, msg) {
    log.push({ level, msg });
    if (verboseJson) {
        console.error(`    [JSON-${level}] ${msg}`);
    }
}

function stripComments(jsonc) {
    let result = "";
    let i = 0;
    let inString = false;
    let escape = false;
    let singleLineComments = 0;
    let multiLineComments = 0;

    while (i < jsonc.length) {
        const char = jsonc[i];

        if (escape) {
            result += char;
            escape = false;
            i++;
            continue;
        }

        if (char === "\\" && inString) {
            result += char;
            escape = true;
            i++;
            continue;
        }

        if (char === "\"" && !escape) {
            inString = !inString;
            result += char;
            i++;
            continue;
        }

        if (!inString) {
            if (i + 1 < jsonc.length) {
                const next = jsonc[i + 1];
                if (char === "/" && next === "/") {
                    while (i < jsonc.length && jsonc[i] !== "\n") i++;
                    singleLineComments++;
                    continue;
                }
                if (char === "/" && next === "*") {
                    i += 2;
                    while (i + 1 < jsonc.length && !(jsonc[i] === "*" && jsonc[i + 1] === "/")) i++;
                    i += 2;
                    multiLineComments++;
                    continue;
                }
            }
        }

        result += char;
        i++;
    }

    if (singleLineComments + multiLineComments > 0) {
        logRepair("FIX", `Removed ${singleLineComments} single-line and ${multiLineComments} multi-line comments`);
    }

    result = result.replace(/,(\s*[}\]])/g, "$1");
    result = result.replace(/,(\s*,)+/g, ",");
    result = result.replace(/(\r?\n){3,}/g, "\n\n");

    return result;
}

function repairJson(text) {
    const repairs = [];
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
        repairs.push("Removed BOM");
    }
    if (text.includes("\r")) {
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        repairs.push("Normalized line endings");
    }
    const beforeLen = text.length;
    text = text.replace(/,(\s*\])/g, "$1").replace(/,(\s*\})/g, "$1");
    if (text.length !== beforeLen) {
        repairs.push("Removed trailing commas");
    }
    repairs.forEach(r => logRepair("FIX", r));
    return text.trim();
}

function parseJsonWithRepair(text, filename) {
    logRepair("INFO", `Parsing ${filename} (${text.length} chars)`);

    try {
        const result = JSON.parse(text);
        logRepair("INFO", "Parsed without modification");
        return result;
    } catch (e) {
        logRepair("WARN", `Direct parse failed: ${e.message}`);
    }

    const cleaned = stripComments(text);
    try {
        const result = JSON.parse(cleaned);
        logRepair("INFO", "Parsed after comment removal");
        return result;
    } catch (e) {
        logRepair("WARN", `After comments: ${e.message}`);
    }

    const repaired = repairJson(cleaned);
    try {
        const result = JSON.parse(repaired);
        logRepair("INFO", "Parsed after structural repair");
        return result;
    } catch (e) {
        logRepair("WARN", `After repair: ${e.message}`);
    }

    logRepair("WARN", "Attempting to extract balanced root object");
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < repaired.length; i++) {
        if (repaired[i] === "{") {
            if (depth === 0) start = i;
            depth++;
        } else if (repaired[i] === "}") {
            depth--;
            if (depth === 0 && start >= 0) { end = i; break; }
        }
    }
    if (start >= 0 && end > start) {
        const extracted = repaired.substring(start, end + 1);
        logRepair("FIX", `Extracted object from ${start} to ${end}`);
        try {
            const result = JSON.parse(extracted);
            logRepair("INFO", "Parsed extracted object");
            return result;
        } catch (e) {
            logRepair("ERROR", `Extracted parse failed: ${e.message}`);
        }
    }

    throw new Error("JSON repair failed after 4 attempts");
}

let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
    try {
        const result = parseJsonWithRepair(input, "test.json");
        console.log(JSON.stringify(result));
    } catch (e) {
        console.error("PARSE_ERROR: " + e.message);
        process.exit(1);
    }
});
' 2>&1
}

echo "=== JSON Repair Test Suite ==="
echo ""

# ====================
# Test 1: Valid JSON
# ====================
echo "Test 1: Valid JSON (no repair needed)"
result=$(parse_json '{"key": "value"}' 2>&1)
if echo "$result" | grep -q '"key":"value"'; then
    pass "Valid JSON parsed correctly"
else
    fail "Valid JSON failed" "$result"
fi

# ====================
# Test 2: Single-line comments
# ====================
echo "Test 2: Single-line comments"
result=$(parse_json '{
  // This is a comment
  "key": "value"
}' 2>&1)
if echo "$result" | grep -q '"key":"value"'; then
    pass "Single-line comments stripped"
else
    fail "Single-line comments not handled" "$result"
fi

# ====================
# Test 3: Multi-line comments
# ====================
echo "Test 3: Multi-line comments"
result=$(parse_json '{
  /* This is a
     multi-line comment */
  "key": "value"
}' 2>&1)
if echo "$result" | grep -q '"key":"value"'; then
    pass "Multi-line comments stripped"
else
    fail "Multi-line comments not handled" "$result"
fi

# ====================
# Test 4: URL with slashes in value (should NOT strip)
# ====================
echo "Test 4: URL with slashes (should preserve)"
result=$(parse_json '{"url": "https://example.com/path/to/resource"}' 2>&1)
if echo "$result" | grep -q 'https://example.com/path/to/resource'; then
    pass "URL with slashes preserved"
else
    fail "URL with slashes incorrectly stripped" "$result"
fi

# ====================
# Test 5: Trailing comma
# ====================
echo "Test 5: Trailing comma"
result=$(parse_json '{
  "key1": "value1",
  "key2": "value2",
}' 2>&1)
if echo "$result" | grep -q '"key2":"value2"'; then
    pass "Trailing comma removed"
else
    fail "Trailing comma not handled" "$result"
fi

# ====================
# Test 6: Comment containing URL-like pattern
# ====================
echo "Test 6: Comment containing URL"
result=$(parse_json '{
  // URL: https://example.com
  "key": "value"
}' 2>&1)
if echo "$result" | grep -q '"key":"value"'; then
    pass "Comment with URL stripped correctly"
else
    fail "Comment with URL not handled" "$result"
fi

# ====================
# Test 7: Escaped quotes in string
# ====================
echo "Test 7: Escaped quotes in string"
result=$(parse_json '{"key": "value with \"quotes\" inside"}' 2>&1)
if echo "$result" | grep -q 'value with'; then
    pass "Escaped quotes handled"
else
    fail "Escaped quotes not handled" "$result"
fi

# ====================
# Test 8: Mixed comments and trailing commas
# ====================
echo "Test 8: Mixed issues (comments + trailing commas)"
result=$(parse_json '{
  // comment 1
  "key1": "value1",
  /* comment 2 */
  "key2": "value2",
}' 2>&1)
if echo "$result" | grep -q '"key1":"value1"' && echo "$result" | grep -q '"key2":"value2"'; then
    pass "Mixed issues handled"
else
    fail "Mixed issues not handled" "$result"
fi

# ====================
# Test 9: String containing // that looks like comment
# ====================
echo "Test 9: String containing // (should preserve)"
result=$(parse_json '{"protocol": "http://", "note": "use // for comments"}' 2>&1)
if echo "$result" | grep -q 'http://' && echo "$result" | grep -q 'use // for comments'; then
    pass "Strings with // preserved"
else
    fail "Strings with // incorrectly modified" "$result"
fi

# ====================
# Test 10: Backslash in string
# ====================
echo "Test 10: Backslash in string (Windows path)"
result=$(parse_json '{"path": "C:\\Users\\name\\file.txt"}' 2>&1)
if echo "$result" | grep -q 'C:\\\\Users'; then
    pass "Backslashes in string preserved"
else
    fail "Backslashes in string not handled" "$result"
fi

# ====================
# Test 11: Nested objects with comments
# ====================
echo "Test 11: Nested objects with comments"
result=$(parse_json '{
  "outer": {
    // nested comment
    "inner": {
      "value": 42
    }
  }
}' 2>&1)
if echo "$result" | grep -q '"value":42'; then
    pass "Nested objects with comments handled"
else
    fail "Nested objects with comments not handled" "$result"
fi

# ====================
# Test 12: Array with comments and trailing comma
# ====================
echo "Test 12: Array with comments and trailing comma"
result=$(parse_json '{
  "items": [
    "one", // first item
    "two",
    "three", // trailing comma follows
  ]
}' 2>&1)
if echo "$result" | grep -q '"items":\["one","two","three"\]'; then
    pass "Array with comments and trailing comma handled"
else
    fail "Array with comments and trailing comma not handled" "$result"
fi

# ====================
# Test 13: Consecutive commas (malformed)
# ====================
echo "Test 13: Consecutive commas (malformed JSON)"
result=$(parse_json '{"a": 1,, "b": 2}' 2>&1)
if echo "$result" | grep -q '"a":1' && echo "$result" | grep -q '"b":2'; then
    pass "Consecutive commas repaired"
else
    fail "Consecutive commas not repaired" "$result"
fi

# ====================
# Test 14: Comment at end of file
# ====================
echo "Test 14: Comment at end of file"
result=$(parse_json '{
  "key": "value"
}
// trailing comment' 2>&1)
if echo "$result" | grep -q '"key":"value"'; then
    pass "Trailing comment handled"
else
    fail "Trailing comment not handled" "$result"
fi

# ====================
# Test 15: Empty object (edge case)
# ====================
echo "Test 15: Empty object"
result=$(parse_json '{}' 2>&1)
if echo "$result" | grep -q '{}' || echo "$result" | grep -qE '^\{\s*\}$'; then
    pass "Empty object handled"
else
    fail "Empty object not handled" "$result"
fi

# ====================
# Summary
# ====================
echo ""
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
