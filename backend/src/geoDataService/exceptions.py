class DataNotFound(Exception):
    """Raised when a requested geo data file is not found."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message
