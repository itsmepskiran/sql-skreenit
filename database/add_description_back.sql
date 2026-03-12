-- Add description column back to companies table
ALTER TABLE companies ADD COLUMN description TEXT NULL;

-- Update existing companies with description if needed
UPDATE companies SET description = 'Company description' WHERE description IS NULL;
