from fastlogger import Logger as FastLogger
from pathlib import Path
from server.config import settings


class LogConfig:
    LOG_DIR = Path("logs")
    MAX_BYTES = 10 * 1024 * 1024
    BACKUP_COUNT = 5
    LOG_LEVEL = "INFO"


LogConfig.LOG_DIR.mkdir(exist_ok=True)


class Logger:
    _instances = {}

    @classmethod
    def get(cls, name: str) -> FastLogger:
        if name not in cls._instances:
            log_file = LogConfig.LOG_DIR / f"{name}.log"
            cls._instances[name] = FastLogger(
                name=name,
                path=str(log_file),
                max_bytes=LogConfig.MAX_BYTES,
                backup_count=LogConfig.BACKUP_COUNT,
                show_output=True,
                level=LogConfig.LOG_LEVEL,
            )
        return cls._instances[name]
