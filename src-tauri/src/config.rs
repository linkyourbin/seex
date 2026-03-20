use std::fs;
use std::path::PathBuf;

const CONFIG_FILENAME: &str = "nlbn_config.txt";

#[derive(Clone)]
pub struct NlbnConfig {
    pub output_path: String,
    pub show_terminal: bool,
}

impl Default for NlbnConfig {
    fn default() -> Self {
        Self {
            output_path: "~/lib".to_string(),
            show_terminal: true,
        }
    }
}

impl NlbnConfig {
    fn config_path() -> PathBuf {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(CONFIG_FILENAME)))
            .unwrap_or_else(|| PathBuf::from(CONFIG_FILENAME))
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => return Self::default(),
        };
        let lines: Vec<&str> = content.lines().collect();
        let output_path = if !lines.is_empty() && !lines[0].is_empty() {
            lines[0].to_string()
        } else {
            "~/lib".to_string()
        };
        let show_terminal = if lines.len() >= 2 {
            lines[1] == "true"
        } else {
            true
        };
        Self {
            output_path,
            show_terminal,
        }
    }

    pub fn save(&self) {
        let path = Self::config_path();
        let _ = fs::write(path, format!("{}\n{}", self.output_path, self.show_terminal));
    }
}
