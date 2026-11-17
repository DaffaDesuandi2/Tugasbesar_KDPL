import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.session import SessionModel

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    db = SessionLocal()
    db.query(SessionModel).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield

def test_registration_success():
    payload = {
        "name": "Andre Prasetya",
        "email": "andre.student@itera.ac.id",
        "password": "Password123",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "andre.student@itera.ac.id"
    assert data["role"] == "mahasiswa"
    assert data["is_active"] is True

    db = SessionLocal()
    user = db.query(User).filter(User.email == payload["email"]).first()
    assert user is not None
    assert user.password_hash.startswith("$2b$")
    assert user.password_hash != "Password123"
    db.close()

def test_registration_weak_password():
    payload = {
        "name": "User Test",
        "email": "test@itera.ac.id",
        "password": "lemah",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422

def test_login_and_session_regeneration():
    client.post("/api/auth/register", json={
        "name": "Mahasiswa Test",
        "email": "mahasiswa@itera.ac.id",
        "password": "AmanPassword2026",
    })

    login_res1 = client.post("/api/auth/login", json={
        "email": "mahasiswa@itera.ac.id",
        "password": "AmanPassword2026",
    })
    assert login_res1.status_code == 200
    session1 = login_res1.json()["session_id"]
    assert len(session1) > 20

    cookie_header = login_res1.headers.get("set-cookie")
    assert "postera_session=" in cookie_header
    assert "HttpOnly" in cookie_header

    login_res2 = client.post(
        "/api/auth/login",
        json={
            "email": "mahasiswa@itera.ac.id",
            "password": "AmanPassword2026",
        },
        cookies={"postera_session": session1},
    )
    assert login_res2.status_code == 200
    session2 = login_res2.json()["session_id"]

    assert session1 != session2

    db = SessionLocal()
    old_s = db.query(SessionModel).filter(SessionModel.session_id == session1).first()
    assert old_s is None
    new_s = db.query(SessionModel).filter(SessionModel.session_id == session2).first()
    assert new_s is not None
    db.close()

def test_logout():
    client.post("/api/auth/register", json={
        "name": "Logout Tester",
        "email": "logout@itera.ac.id",
        "password": "LogoutTest123",
    })
    login_res = client.post("/api/auth/login", json={
        "email": "logout@itera.ac.id",
        "password": "LogoutTest123",
    })
    session_id = login_res.json()["session_id"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_id}"})
    assert me_res.status_code == 200

    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {session_id}"})
    assert logout_res.status_code == 200

    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_id}"})
    assert me_after.status_code == 401

def test_login_rate_limiting():
    for _ in range(5):
        client.post("/api/auth/login", json={
            "email": "nonexistent@itera.ac.id",
            "password": "WrongPassword123",
        })

    res_blocked = client.post("/api/auth/login", json={
        "email": "nonexistent@itera.ac.id",
        "password": "WrongPassword123",
    })
    assert res_blocked.status_code == 429
    assert "Terlalu banyak percobaan login" in res_blocked.json()["detail"]
