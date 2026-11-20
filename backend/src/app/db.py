from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection, connect
from psycopg.rows import dict_row

from .config import settings


@contextmanager
def get_connection() -> Iterator[Connection[dict]]:
    """Yield a dict-row connection, committing on success and rolling back on error."""
    connection = connect(settings.database_url, row_factory=dict_row)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
