-- Add company_display_id column to companies table
ALTER TABLE companies ADD COLUMN company_display_id VARCHAR(20) NULL;

-- Create index for faster lookups
CREATE INDEX idx_companies_display_id ON companies(company_display_id);

-- Update existing companies with display IDs
UPDATE companies SET company_display_id = CONCAT('SKR-', LPAD(id, 3, '0')) WHERE company_display_id IS NULL;
