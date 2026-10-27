-- migrations/0008_add_problem_cause_column.sql
-- Add ProblemCause / problem_cause column to workorders and repair_requests tables

ALTER TABLE workorders ADD COLUMN ProblemCause TEXT;
ALTER TABLE repair_requests ADD COLUMN problem_cause TEXT;
