"""
PostgreSQL SQLAlchemy models matching PRD Section 7.1 Database Design.
"""

import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
    Enum as SQLEnum,
    JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    role = Column(SQLEnum("farmer", "agronomist", name="user_roles"), nullable=False, default="farmer")
    password_hash = Column(Text, nullable=False)

    fields = relationship("Field", back_populates="owner")
    confirmed_scans = relationship("Scan", back_populates="confirmed_by_user")


class Field(Base):
    __tablename__ = "fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    boundary_geo = Column(JSON, nullable=True)  # GeoJSON polygon or bounding box

    owner = relationship("User", back_populates="fields")
    zones = relationship("Zone", back_populates="field", cascade="all, delete-orphan")


class Zone(Base):
    __tablename__ = "zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id = Column(UUID(as_uuid=True), ForeignKey("fields.id"), nullable=False)
    lat = Column(Float, nullable=False)
    long = Column(Float, nullable=False)
    label = Column(String(100), nullable=False)  # e.g., "Zone A3"

    field = relationship("Field", back_populates="zones")
    scans = relationship("Scan", back_populates="zone")
    risk_scores = relationship("ZoneRiskScore", back_populates="zone", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)  # nullable for Quick Scans
    image_ref = Column(Text, nullable=False)
    category = Column(SQLEnum("plant", "fruit", name="scan_categories"), nullable=False)
    predicted_class = Column(String(255), nullable=False)
    confidence = Column(Float, nullable=False)
    is_uncertain = Column(Boolean, default=False)
    severity = Column(SQLEnum("none", "mild", "moderate", "severe", name="severity_levels"), nullable=False, default="none")
    gradcam_ref = Column(Text, nullable=True)
    report_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    confirmed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    zone = relationship("Zone", back_populates="scans")
    confirmed_by_user = relationship("User", back_populates="confirmed_scans")
    questions = relationship("ScanQuestion", back_populates="scan", cascade="all, delete-orphan")


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disease_class = Column(String(255), nullable=False, index=True)
    severity = Column(SQLEnum("none", "mild", "moderate", "severe", name="treatment_severities"), nullable=False)
    recommendation_text = Column(Text, nullable=False)
    spray_action = Column(Text, nullable=False)  # Decision support string, e.g., "Targeted copper fungicide, Zone A3"


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disease_class = Column(String(255), unique=True, nullable=False, index=True)
    symptoms = Column(Text, nullable=False)
    spread_mechanism = Column(Text, nullable=False)
    treatment_options = Column(Text, nullable=False)
    safety_notes = Column(Text, nullable=False)  # e.g., "Safe to consume after removing lesion area"

    referenced_questions = relationship("ScanQuestion", back_populates="kb_entry")


class ScanQuestion(Base):
    __tablename__ = "scan_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    kb_entry_used = Column(UUID(as_uuid=True), ForeignKey("knowledge_base.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="questions")
    kb_entry = relationship("KnowledgeBase", back_populates="referenced_questions")


class ZoneRiskScore(Base):
    __tablename__ = "zone_risk_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    risk_score = Column(Float, nullable=False)  # 0 - 100
    risk_level = Column(SQLEnum("low", "moderate", "high", name="risk_levels"), nullable=False)
    method = Column(String(50), default="rule_based_v1", nullable=False)  # explicit versioning per PRD
    contributing_factors = Column(Text, nullable=True)  # e.g. "Sustained humidity >80% for 3+ days"

    zone = relationship("Zone", back_populates="risk_scores")
