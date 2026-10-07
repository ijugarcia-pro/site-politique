import duckdb


def test_duckdb_repond():
    assert duckdb.sql("SELECT 1").fetchone() == (1,)
