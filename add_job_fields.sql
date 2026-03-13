-- Migration script to add new fields to jobs table
-- Run this after updating the code

ALTER TABLE jobs 
ADD COLUMN education_qualification VARCHAR(50) NULL,
ADD COLUMN work_location_preference VARCHAR(50) NULL;

-- Verify the columns were added
DESCRIBE jobs;
