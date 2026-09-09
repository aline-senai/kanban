"""remove password_reset_tokens (fluxo de reset por e-mail foi substituído por notificação)

Revision ID: a4c5d6e7f8b9
Revises: f2b3c4d5e6a7
Create Date: 2026-09-09 01:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a4c5d6e7f8b9'
down_revision = 'f2b3c4d5e6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('password_reset_tokens')


def downgrade() -> None:
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_password_reset_tokens_token_hash'), 'password_reset_tokens', ['token_hash'], unique=True)
