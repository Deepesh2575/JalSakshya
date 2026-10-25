from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user:
        # Fallback to create demo user if not found
        user = User(
            id=f"usr-{creds.username}",
            username=creds.username,
            full_name=creds.username.replace("_", " ").title(),
            hashed_password="mock",
            role=UserRole.OFFICER if "officer" in creds.username else UserRole.FIELD_WORKER,
            district="Datia"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Simplified token for rapid development & offline testing
    token = f"jwt-mock-token-for-{user.username}-{user.role.value}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
