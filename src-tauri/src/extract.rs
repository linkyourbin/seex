use regex::Regex;

/// Extract a component ID from `content` using `keyword`.
///
/// If `keyword` starts with `regex:` the remainder is compiled as a regex and
/// capture-group 1 (if present) or group 0 is returned.
/// Otherwise a literal substring search is performed and the first
/// alphanumeric token after the keyword is returned.
pub fn extract_by_keyword(content: &str, keyword: &str) -> Option<String> {
    // --- regex mode ---
    if let Some(pattern) = keyword.strip_prefix("regex:") {
        let re = Regex::new(pattern).ok()?;
        let caps = re.captures(content)?;
        let m = caps.get(1).or_else(|| caps.get(0))?;
        let s = m.as_str().to_owned();
        if !s.is_empty() {
            return Some(s);
        }
        return None;
    }

    // --- literal mode ---
    if let Some(pos) = content.find(keyword) {
        let after_keyword = &content[pos + keyword.len()..];
        let extracted = after_keyword.trim();
        let result = extracted.split_whitespace().next().unwrap_or(extracted);
        let cleaned: String = result
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .collect();
        if !cleaned.is_empty() {
            return Some(cleaned);
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn literal_keyword() {
        assert_eq!(
            extract_by_keyword("\u{7f16}\u{53f7}\u{ff1a}C12345 foo", "\u{7f16}\u{53f7}\u{ff1a}"),
            Some("C12345".into())
        );
    }

    #[test]
    fn regex_keyword_group0() {
        assert_eq!(
            extract_by_keyword("part C12345 ok", "regex:C\\d+"),
            Some("C12345".into())
        );
    }

    #[test]
    fn regex_keyword_group1() {
        assert_eq!(
            extract_by_keyword("part C12345 ok", "regex:C(\\d+)"),
            Some("12345".into())
        );
    }

    #[test]
    fn regex_no_match() {
        assert_eq!(extract_by_keyword("hello world", "regex:C\\d+"), None);
    }

    #[test]
    fn literal_no_match() {
        assert_eq!(extract_by_keyword("hello world", "\u{7f16}\u{53f7}\u{ff1a}"), None);
    }
}
