from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import anexos, atividades, auth, checklist, estagios, grupos, health, turmas, users

app = FastAPI(title="Kanban Turmas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(turmas.router)
app.include_router(grupos.router)
app.include_router(estagios.router)
app.include_router(atividades.router)
app.include_router(checklist.router)
app.include_router(anexos.router)
