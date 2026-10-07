import pytest
from fastapi.testclient import TestClient
from backend.server.main import app

@pytest.fixture(scope="module")
def client():
    # Context manager triggers lifespan (startup and shutdown)
    with TestClient(app) as test_client:
        yield test_client

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["assistant"] == "Aira"

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "history_length" in data

def test_memory_endpoints(client):
    response = client.get("/memory")
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 3
    assert len(data["chats"]) <= 3

def test_clear_endpoint(client):
    response = client.post("/clear")
    assert response.status_code == 200
    assert response.json()["status"] == "cleared"
