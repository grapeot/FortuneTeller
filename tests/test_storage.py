import json
from urllib.parse import parse_qs, urlsplit

from server import storage as share_storage


class _FakeCursor:
    def __init__(self, state):
        self.state = state
        self.rowcount = 0
        self._last_row = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        normalized = " ".join(query.split()).lower()
        if params is None:
            return

        if normalized.startswith("create table if not exists"):
            return

        if normalized.startswith("insert into"):
            share_id, payload = params
            self.state[share_id] = json.loads(payload)
            return

        if normalized.startswith("select data::text"):
            share_id = params[0]
            data = self.state.get(share_id)
            self._last_row = (json.dumps(data),) if data is not None else None
            return

        if normalized.startswith("update"):
            payload, share_id = params
            updates = json.loads(payload)
            if share_id not in self.state:
                self.rowcount = 0
            else:
                self.state[share_id].update(updates)
                self.rowcount = 1
            return

    def fetchone(self):
        return self._last_row


class _FakeConnection:
    def __init__(self, state):
        self.state = state

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return _FakeCursor(self.state)

    def commit(self):
        return None


class _FakePsycopg:
    def __init__(self):
        self.state = {}

    def connect(self, _url):
        return _FakeConnection(self.state)


def test_postgres_storage_create_get_update(monkeypatch):
    fake = _FakePsycopg()
    monkeypatch.setattr(share_storage, "_load_psycopg_module", lambda: fake)

    storage = share_storage.PostgresShareStorage("postgres://local")
    storage.create_share("abc123", {"fortunes": {"grok": {"face": "a"}}})

    created = storage.get_share("abc123")
    assert created is not None
    assert created["fortunes"]["grok"]["face"] == "a"

    storage.update_share("abc123", {"analysis_l2": "done"})
    updated = storage.get_share("abc123")
    assert updated is not None
    assert updated["analysis_l2"] == "done"


def test_storage_auto_picks_postgres_when_url_set(monkeypatch):
    fake = _FakePsycopg()
    monkeypatch.setattr(share_storage, "_load_psycopg_module", lambda: fake)
    monkeypatch.setenv("SHARE_STORAGE_BACKEND", "auto")
    monkeypatch.setenv("SHARE_DATABASE_URL", "postgres://local")

    share_storage.reset_share_storage_from_env()
    storage = share_storage.get_share_storage()

    assert isinstance(storage, share_storage.PostgresShareStorage)


def test_storage_picks_firebase_when_configured(monkeypatch):
    monkeypatch.setenv("SHARE_STORAGE_BACKEND", "firebase")
    monkeypatch.delenv("SHARE_DATABASE_URL", raising=False)

    share_storage.reset_share_storage_from_env()
    storage = share_storage.get_share_storage()

    assert isinstance(storage, share_storage.FirebaseShareStorage)


def test_postgres_url_normalization_adds_ssl_and_endpoint(monkeypatch):
    fake = _FakePsycopg()
    monkeypatch.setattr(share_storage, "_load_psycopg_module", lambda: fake)

    storage = share_storage.PostgresShareStorage(
        "postgres://u:p@ep-aged-waterfall-aioqg50r.c-4.us-east-1.pg.koyeb.app/koyebdb"
    )
    parsed = urlsplit(storage._database_url)
    query = parse_qs(parsed.query)

    assert query.get("sslmode") == ["require"]
    assert query.get("options") == ["endpoint=ep-aged-waterfall-aioqg50r"]
