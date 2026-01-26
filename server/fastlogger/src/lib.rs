use pyo3::prelude::*;
use std::fs::{OpenOptions, rename};
use std::io::Write;
use chrono::Local;

#[derive(PartialEq, PartialOrd)]
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
}

impl LogLevel {
    fn from_str(level: &str) -> Self {
        match level.to_uppercase().as_str() {
            "DEBUG" => LogLevel::DEBUG,
            "INFO" => LogLevel::INFO,
            "WARNING" => LogLevel::WARNING,
            "ERROR" => LogLevel::ERROR,
            _ => LogLevel::INFO,
        }
    }
}

fn rotate(path: &str, max: u64, count: usize) {
    let m = std::fs::metadata(path).ok();
    if let Some(meta) = m {
        if meta.len() >= max {
            for i in (1..count).rev() {
                let o = format!("{}.{}", path, i);
                let n = format!("{}.{}", path, i + 1);
                if std::path::Path::new(&o).exists() {
                    rename(&o, &n).ok();
                }
            }
            let f = format!("{}.1", path);
            rename(path, f).ok();
        }
    }
}

#[pyclass]
struct Logger {
    name: String,
    path: String,
    max_bytes: u64,
    backup_count: usize,
    show_output: bool,
    level: LogLevel,
}

#[pymethods]
impl Logger {
    #[new]
    fn new(name: String, path: String, max_bytes: u64, backup_count: usize, show_output: bool, level: String) -> Self {
        let level_enum = LogLevel::from_str(&level);
        Logger { name, path, max_bytes, backup_count, show_output, level: level_enum }
    }

    fn write(&self, level_str: &str, msg: &str) {
        let msg_level = LogLevel::from_str(level_str);
        if msg_level < self.level {
            return;
        }

        rotate(&self.path, self.max_bytes, self.backup_count);
        let mut f = OpenOptions::new().create(true).append(true).open(&self.path).unwrap();
        let ts = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let line = format!("{} | {} | {} | {}\n", ts, level_str, self.name, msg);
        f.write_all(line.as_bytes()).ok();
        if self.show_output {
            print!("{}", line);
        }
    }

    fn info(&self, msg: &str) {
        self.write("INFO", msg);
    }

    fn error(&self, msg: &str) {
        self.write("ERROR", msg);
    }

    fn warning(&self, msg: &str) {
        self.write("WARNING", msg);
    }

    fn debug(&self, msg: &str) {
        self.write("DEBUG", msg);
    }
}

#[pymodule]
fn fastlogger(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<Logger>()?;
    Ok(())
}

