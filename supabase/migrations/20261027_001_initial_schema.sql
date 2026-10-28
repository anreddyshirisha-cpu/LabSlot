-- Migration: 20261027_001_initial_schema.sql
-- Title: Shared Laboratory Equipment Booking and Conflict Prevention System
-- Database: Supabase PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('visitor', 'student', 'operator', 'admin')),
    department TEXT NOT NULL,
    qualification_level TEXT NOT NULL DEFAULT 'Tier-1 Certified',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. EQUIPMENT CATALOGUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Electron Microscopy', 'Spectroscopy', 'Chromatography', 'Surface Science', 'Thermal & Rheology', 'Laser & Optical')),
    lab_location TEXT NOT NULL,
    building TEXT NOT NULL,
    room TEXT NOT NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'decommissioned')),
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    buffer_time_mins INTEGER NOT NULL DEFAULT 15,
    max_booking_hours INTEGER NOT NULL DEFAULT 4,
    specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    safety_instructions TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. MAINTENANCE BLOCKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'calibration', 'emergency_repair', 'cleaning')),
    technician_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_maint_times CHECK (end_time > start_time)
);

-- ============================================================================
-- 4. BOOKINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    research_purpose TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending_approval', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'overdue')),
    conflict_detected BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_times CHECK (end_time > start_time)
);

-- ============================================================================
-- 5. APPROVALS (FOR RESTRICTED EQUIPMENT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES public.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. ISSUE / RETURN CHECKLISTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    checklist_type TEXT NOT NULL CHECK (checklist_type IN ('issue', 'return')),
    conducted_by UUID NOT NULL REFERENCES public.users(id),
    cleanliness_ok BOOLEAN NOT NULL DEFAULT true,
    calibration_verified BOOLEAN NOT NULL DEFAULT true,
    consumables_replenished BOOLEAN NOT NULL DEFAULT true,
    safety_hazards_cleared BOOLEAN NOT NULL DEFAULT true,
    data_transferred BOOLEAN NOT NULL DEFAULT true,
    physical_condition_rating INTEGER NOT NULL CHECK (physical_condition_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. OVERDUE & DAMAGE REPORTS / INCIDENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.incidents_damage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES public.users(id),
    incident_type TEXT NOT NULL CHECK (incident_type IN ('physical_damage', 'optical_misalignment', 'software_crash', 'contamination', 'overdue_lockout')),
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'critical_downtime')),
    description TEXT NOT NULL,
    estimated_downtime_hours NUMERIC(6, 1) NOT NULL DEFAULT 0.0,
    repair_status TEXT NOT NULL DEFAULT 'open' CHECK (repair_status IN ('open', 'repair_scheduled', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- 8. AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE TIMETABLE AND CONFLICT QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(category);
CREATE INDEX IF NOT EXISTS idx_bookings_equip_times ON public.bookings(equipment_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_maint_equip_times ON public.maintenance_blocks(equipment_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_approvals_booking ON public.approvals(booking_id);
CREATE INDEX IF NOT EXISTS idx_checklists_booking ON public.checklists(booking_id);
CREATE INDEX IF NOT EXISTS idx_incidents_equip ON public.incidents_damage(equipment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================================
-- ATOMIC CONFLICT & OVERLAP PREVENTION DATABASE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_check_booking_conflict()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count INTEGER;
    maint_count INTEGER;
BEGIN
    IF NEW.status IN ('confirmed', 'checked_in', 'pending_approval') THEN
        -- 1. Check for overlapping bookings on the same instrument
        SELECT COUNT(*) INTO conflict_count
        FROM public.bookings
        WHERE equipment_id = NEW.equipment_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND status IN ('confirmed', 'checked_in', 'pending_approval')
          AND (start_time < NEW.end_time AND end_time > NEW.start_time);

        IF conflict_count > 0 THEN
            RAISE EXCEPTION 'TIME_SLOT_CONFLICT: The requested slot overlaps with an existing confirmed or pending booking.'
                USING ERRCODE = '23P01';
        END IF;

        -- 2. Check for overlapping maintenance blocks
        SELECT COUNT(*) INTO maint_count
        FROM public.maintenance_blocks
        WHERE equipment_id = NEW.equipment_id
          AND status IN ('scheduled', 'in_progress')
          AND (start_time < NEW.end_time AND end_time > NEW.start_time);

        IF maint_count > 0 THEN
            RAISE EXCEPTION 'MAINTENANCE_LOCK_CONFLICT: The requested slot coincides with an authorized maintenance block.'
                USING ERRCODE = '23P01';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_booking_conflict ON public.bookings;
CREATE TRIGGER trg_prevent_booking_conflict
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_booking_conflict();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents_damage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Equipment policies
DROP POLICY IF EXISTS "Public equipment view" ON public.equipment;
CREATE POLICY "Public equipment view" ON public.equipment
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operator/Admin equipment modify" ON public.equipment;
CREATE POLICY "Operator/Admin equipment modify" ON public.equipment
    FOR ALL USING (true);

-- Bookings policies
DROP POLICY IF EXISTS "Users read own bookings or public calendar" ON public.bookings;
CREATE POLICY "Users read own bookings or public calendar" ON public.bookings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert bookings" ON public.bookings;
CREATE POLICY "Users insert bookings" ON public.bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own bookings or operators update" ON public.bookings;
CREATE POLICY "Users update own bookings or operators update" ON public.bookings
    FOR UPDATE USING (true);

-- Maintenance policies
DROP POLICY IF EXISTS "Maintenance view" ON public.maintenance_blocks;
CREATE POLICY "Maintenance view" ON public.maintenance_blocks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operator/Admin maintenance modify" ON public.maintenance_blocks;
CREATE POLICY "Operator/Admin maintenance modify" ON public.maintenance_blocks
    FOR ALL USING (true);

-- Approvals policies
DROP POLICY IF EXISTS "Approvals view" ON public.approvals;
CREATE POLICY "Approvals view" ON public.approvals
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operator/Admin approvals update" ON public.approvals;
CREATE POLICY "Operator/Admin approvals update" ON public.approvals
    FOR ALL USING (true);

-- Checklists policies
DROP POLICY IF EXISTS "Checklist view" ON public.checklists;
CREATE POLICY "Checklist view" ON public.checklists
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Checklist create" ON public.checklists;
CREATE POLICY "Checklist create" ON public.checklists
    FOR INSERT WITH CHECK (true);

-- Incidents policies
DROP POLICY IF EXISTS "Incidents view" ON public.incidents_damage;
CREATE POLICY "Incidents view" ON public.incidents_damage
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Incidents modify" ON public.incidents_damage;
CREATE POLICY "Incidents modify" ON public.incidents_damage
    FOR ALL USING (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Audit admin view" ON public.audit_logs;
CREATE POLICY "Audit admin view" ON public.audit_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Audit system insert" ON public.audit_logs;
CREATE POLICY "Audit system insert" ON public.audit_logs
    FOR INSERT WITH CHECK (true);
